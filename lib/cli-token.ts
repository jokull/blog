import { z } from "zod/v4";
import { env } from "@/env";

async function getKey(): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(env.GITHUB_CLIENT_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

/** Create a signed CLI token for the given username. */
export async function createCliToken(username: string): Promise<string> {
	const payload = JSON.stringify({ sub: username, iat: Math.floor(Date.now() / 1000) });
	const key = await getKey();
	const encoder = new TextEncoder();
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	const payloadB64 = btoa(payload);
	return `${payloadB64}.${toHex(signature)}`;
}

/** Verify a CLI token and return the username, or null if invalid. */
export async function verifyCliToken(token: string): Promise<string | null> {
	const dotIndex = token.indexOf(".");
	if (dotIndex === -1) return null;

	const payloadB64 = token.slice(0, dotIndex);
	const signatureHex = token.slice(dotIndex + 1);

	let payload: string;
	try {
		payload = atob(payloadB64);
	} catch {
		return null;
	}

	const key = await getKey();
	const encoder = new TextEncoder();
	// Copy into a clean ArrayBuffer to satisfy BufferSource type
	const sigBytes = fromHex(signatureHex);
	const sigBuffer = new ArrayBuffer(sigBytes.length);
	new Uint8Array(sigBuffer).set(sigBytes);
	const valid = await crypto.subtle.verify("HMAC", key, sigBuffer, encoder.encode(payload));
	if (!valid) return null;

	const result = z.object({ sub: z.string() }).safeParse(JSON.parse(payload));
	if (!result.success) return null;
	return result.data.sub;
}
