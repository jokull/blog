/* eslint-disable no-console */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { safeFetchJson, safeZodParse } from "../lib/safe-utils";

const SESSION_FILE = `${process.env.HOME}/.blog-cli-session`;

const storedSessionSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	expires_at: z.number(),
});

type StoredSession = z.infer<typeof storedSessionSchema>;

function readSession(): StoredSession | null {
	if (!existsSync(SESSION_FILE)) return null;
	const content = readFileSync(SESSION_FILE, "utf-8").trim();
	if (!content) return null;

	// Migrate plain token string from old format
	try {
		const result = storedSessionSchema.safeParse(JSON.parse(content));
		if (result.success) return result.data;
	} catch {
		// Old format: plain access token string without refresh support
	}
	return null;
}

function writeSession(session: StoredSession) {
	writeFileSync(SESSION_FILE, JSON.stringify(session), "utf-8");
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
	refresh_token: z.string().optional(),
	refresh_token_expires_in: z.number().optional(),
	token_type: z.string().optional(),
	scope: z.string().optional(),
	expires_in: z.number().optional(),
	error: z.string().optional(),
	error_description: z.string().optional(),
	interval: z.number().optional(),
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

function sessionFromTokenResponse(data: z.infer<typeof tokenResponseSchema>): StoredSession {
	const expiresIn = data.expires_in ?? 28800; // Default 8 hours
	return {
		access_token: data.access_token!,
		refresh_token: data.refresh_token!,
		expires_at: Date.now() + expiresIn * 1000,
	};
}

async function pollForToken(
	clientId: string,
	deviceCode: string,
	interval: number,
): Promise<StoredSession> {
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

		if (data.access_token && data.refresh_token) {
			return sessionFromTokenResponse(data);
		}

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

async function refreshAccessToken(apiBase: string, refreshToken: string): Promise<StoredSession> {
	const clientId = await fetchClientId(apiBase);

	const result = await safeFetchJson("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: clientId,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	});

	const data = result
		.andThen(safeZodParse(tokenResponseSchema))
		.unwrap("Failed to refresh token");

	if (data.access_token && data.refresh_token) {
		return sessionFromTokenResponse(data);
	}

	throw new Error(
		`Token refresh failed: ${data.error ?? "unknown"} - ${data.error_description ?? ""}`,
	);
}

/** Get a valid access token, refreshing automatically if expired. Returns null if not logged in. */
export async function getValidToken(apiBase: string): Promise<string | null> {
	const session = readSession();
	if (!session) return null;

	// Refresh if token expires within 5 minutes
	if (session.expires_at - Date.now() < 5 * 60 * 1000) {
		try {
			const refreshed = await refreshAccessToken(apiBase, session.refresh_token);
			writeSession(refreshed);
			return refreshed.access_token;
		} catch (error) {
			console.error("Token refresh failed — please run 'bun run blog login' again.");
			console.error(error instanceof Error ? error.message : error);
			return null;
		}
	}

	return session.access_token;
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

	const session = await pollForToken(clientId, deviceCode.device_code, deviceCode.interval);
	writeSession(session);

	return session.access_token;
}
