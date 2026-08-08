/* eslint-disable no-console */
/**
 * `blog login`: GitHub's device flow, then an exchange for a signed CLI token.
 *
 * Our half of the flow is two RPC procedures (`cli.oauthConfig`,
 * `cli.exchangeToken`) through the same contract as everything else. GitHub's
 * own endpoints are plain fetch — they are not ours — but nothing in this file
 * throws: the device flow returns Results too, so `blog login` has one failure
 * channel rather than a Result for our half and exceptions for GitHub's.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { Result } from "better-result";
import { defineErrors, err, ok, wire, type InferErr } from "result-rpc";
import * as v from "valibot";
import { safeFetchJson, safeParse } from "../lib/safe-utils";
import { createClient, type BlogClient } from "./client";

/**
 * Exactly what the two procedures this flow calls can fail with — derived from
 * their own client signatures rather than from the whole contract, so it does
 * not widen to every tag in the app and `cli/failures.ts` stays honest about
 * what it has actually handled.
 */
export type LoginFailure = InferErr<
	| Awaited<ReturnType<BlogClient["cli"]["oauthConfig"]>>
	| Awaited<ReturnType<BlogClient["cli"]["exchangeToken"]>>
>;

const SESSION_FILE = `${process.env.HOME}/.blog-cli-session`;

function readToken(): string | null {
	if (!existsSync(SESSION_FILE)) return null;
	const content = readFileSync(SESSION_FILE, "utf-8").trim();
	if (!content) return null;

	// The current format is a plain app token, which always contains a dot.
	if (content.includes(".") && !content.startsWith("{")) return content;

	// Old JSON format — discard, the user needs to re-login.
	return null;
}

function writeToken(token: string) {
	writeFileSync(SESSION_FILE, token, "utf-8");
}

export function clearToken() {
	if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
}

/**
 * GitHub's device flow is not in our contract, so its failures get their own
 * private tag rather than being smuggled into one of ours. Private errors
 * cannot cross the RPC wire by construction, which is exactly right: nothing
 * here is a response to a caller, it is this process talking to github.com.
 */
export const deviceFlowErrors = defineErrors("device-flow", {
	failed: { data: wire.object({ reason: wire.string }), visibility: "private" },
});

export type DeviceFlowError = ReturnType<typeof deviceFlowErrors.failed>;

const DeviceCodeSchema = v.object({
	device_code: v.string(),
	user_code: v.string(),
	verification_uri: v.string(),
	expires_in: v.number(),
	interval: v.number(),
});

const TokenResponseSchema = v.object({
	access_token: v.optional(v.string()),
	token_type: v.optional(v.string()),
	scope: v.optional(v.string()),
	error: v.optional(v.string()),
	error_description: v.optional(v.string()),
	interval: v.optional(v.number()),
});

type DeviceCode = v.InferOutput<typeof DeviceCodeSchema>;

async function requestDeviceCode(clientId: string): Promise<Result<DeviceCode, DeviceFlowError>> {
	const requested = await Result.gen(async function* () {
		const payload = yield* await safeFetchJson("https://github.com/login/device/code", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({ client_id: clientId, scope: "user:email" }),
		});
		return ok(yield* safeParse(DeviceCodeSchema)(payload));
	});

	// Both the fetch failure and the schema failure collapse to one tag: the
	// operator cannot do anything different about "GitHub is down" and
	// "GitHub answered something unexpected".
	return Result.mapError(requested, (error) =>
		deviceFlowErrors.failed({ reason: describeIssue(error) }),
	);
}

const describeIssue = (error: { readonly _tag: string; readonly data: unknown }) =>
	`${error._tag} ${JSON.stringify(error.data)}`;

async function pollForGitHubToken(
	clientId: string,
	deviceCode: string,
	interval: number,
): Promise<Result<string, DeviceFlowError>> {
	let pollInterval = interval * 1000;

	for (;;) {
		await new Promise((resolve) => setTimeout(resolve, pollInterval));

		const response = await safeFetchJson("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: clientId,
				device_code: deviceCode,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			}),
		});
		if (response.isErr())
			return err(deviceFlowErrors.failed({ reason: describeIssue(response.error) }));

		const parsed = safeParse(TokenResponseSchema)(response.value);
		if (parsed.isErr())
			return err(deviceFlowErrors.failed({ reason: describeIssue(parsed.error) }));

		const data = parsed.value;
		if (data.access_token) return ok(data.access_token);
		if (data.error === "authorization_pending") continue;

		if (data.error === "slow_down") {
			// GitHub tells us to back off; honour the interval it returns.
			pollInterval = (data.interval ?? interval + 5) * 1000;
			continue;
		}

		if (data.error === "expired_token") {
			return err(deviceFlowErrors.failed({ reason: "The device code expired." }));
		}
		if (data.error === "access_denied") {
			return err(deviceFlowErrors.failed({ reason: "Authorization was denied." }));
		}
		if (data.error) {
			return err(
				deviceFlowErrors.failed({
					reason: `${data.error}${data.error_description ? ` — ${data.error_description}` : ""}`,
				}),
			);
		}
	}
}

/** Get the stored app token, or null if not logged in. */
export function getValidToken(): string | null {
	return readToken();
}

/**
 * The whole flow as one Result. Nothing throws, so `blog login` reports a
 * denied authorization, an expired device code, an unreachable origin and a
 * non-admin GitHub account through the same channel.
 */
export async function login(): Promise<Result<string, LoginFailure | DeviceFlowError>> {
	return Result.gen(async function* () {
		console.log("Fetching OAuth configuration...");
		const config = yield* await createClient().cli.oauthConfig({});

		console.log("Requesting device authorization...");
		const deviceCode = yield* await requestDeviceCode(config.clientId);

		console.log(`\n${"─".repeat(50)}`);
		console.log("To authenticate, visit:");
		console.log(`  ${deviceCode.verification_uri}`);
		console.log("\nAnd enter the code:");
		console.log(`  ${deviceCode.user_code}`);
		console.log(`${"─".repeat(50)}\n`);
		console.log("Waiting for authorization...");

		const githubToken = yield* await pollForGitHubToken(
			config.clientId,
			deviceCode.device_code,
			deviceCode.interval,
		);

		console.log("Exchanging for app token...");
		// The GitHub token authenticates this one call: the session middleware
		// resolves it to a viewer, and AdminLayer decides whether that viewer may
		// have a CLI token at all.
		const exchanged = yield* await createClient(githubToken).cli.exchangeToken({});

		writeToken(exchanged.token);
		return ok(exchanged.token);
	});
}
