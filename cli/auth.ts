/* eslint-disable no-console */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { safeFetchJson, safeZodParse } from "../lib/safe-utils";

const SESSION_FILE = `${process.env.HOME}/.blog-cli-session`;

function readToken(): string | null {
	if (!existsSync(SESSION_FILE)) return null;
	const content = readFileSync(SESSION_FILE, "utf-8").trim();
	if (!content) return null;

	// Try new format (plain app token)
	if (content.includes(".") && !content.startsWith("{")) {
		return content;
	}

	// Old JSON format — discard, user needs to re-login
	return null;
}

function writeToken(token: string) {
	writeFileSync(SESSION_FILE, token, "utf-8");
}

export function clearToken() {
	if (existsSync(SESSION_FILE)) {
		unlinkSync(SESSION_FILE);
	}
}

const oauthConfigSchema = z.object({
	clientId: z.string(),
});

const deviceCodeSchema = z.object({
	device_code: z.string(),
	user_code: z.string(),
	verification_uri: z.string(),
	expires_in: z.number(),
	interval: z.number(),
});

const tokenResponseSchema = z.object({
	access_token: z.string().optional(),
	token_type: z.string().optional(),
	scope: z.string().optional(),
	error: z.string().optional(),
	error_description: z.string().optional(),
	interval: z.number().optional(),
});

const cliTokenResponseSchema = z.object({
	token: z.string(),
});

async function fetchClientId(apiBase: string): Promise<string> {
	const result = await safeFetchJson(`${apiBase}/api/oauth-config`);
	const data = result
		.andThen(safeZodParse(oauthConfigSchema))
		.unwrap("Failed to fetch OAuth config");
	return data.clientId;
}

async function requestDeviceCode(clientId: string) {
	const result = await safeFetchJson("https://github.com/login/device/code", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: clientId,
			scope: "user:email",
		}),
	});
	return result.andThen(safeZodParse(deviceCodeSchema)).unwrap("Failed to request device code");
}

async function pollForGitHubToken(clientId: string, deviceCode: string, interval: number) {
	const pollInterval = interval * 1000;

	for (;;) {
		await new Promise((resolve) => setTimeout(resolve, pollInterval));

		const result = await safeFetchJson("https://github.com/login/oauth/access_token", {
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

		const data = result
			.andThen(safeZodParse(tokenResponseSchema))
			.unwrap("OAuth token poll failed");

		if (data.access_token) return data.access_token;

		if (data.error === "authorization_pending") continue;

		if (data.error === "slow_down") {
			await new Promise((resolve) => setTimeout(resolve, 5000));
			continue;
		}

		if (data.error === "expired_token") {
			throw new Error("Device code expired. Please try again.");
		}

		if (data.error === "access_denied") {
			throw new Error("Authorization was denied by the user.");
		}

		if (data.error) {
			throw new Error(`OAuth error: ${data.error} - ${data.error_description ?? ""}`);
		}
	}
}

async function exchangeForAppToken(apiBase: string, githubToken: string): Promise<string> {
	const result = await safeFetchJson(`${apiBase}/api/cli-token`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${githubToken}`,
		},
	});
	const data = result
		.andThen(safeZodParse(cliTokenResponseSchema))
		.unwrap("Failed to exchange token");
	return data.token;
}

/** Get the stored app token, or null if not logged in. */
export async function getValidToken(_apiBase: string): Promise<string | null> {
	return readToken();
}

export async function login(apiBase: string): Promise<string> {
	console.log("Fetching OAuth configuration...");
	const clientId = await fetchClientId(apiBase);

	console.log("Requesting device authorization...");
	const deviceCode = await requestDeviceCode(clientId);

	console.log("\n" + "─".repeat(50));
	console.log("To authenticate, visit:");
	console.log(`  ${deviceCode.verification_uri}`);
	console.log("\nAnd enter the code:");
	console.log(`  ${deviceCode.user_code}`);
	console.log("─".repeat(50) + "\n");
	console.log("Waiting for authorization...");

	const githubToken = await pollForGitHubToken(
		clientId,
		deviceCode.device_code,
		deviceCode.interval,
	);

	console.log("Exchanging for app token...");
	const appToken = await exchangeForAppToken(apiBase, githubToken);
	writeToken(appToken);

	return appToken;
}
