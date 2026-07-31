import { hc } from "hono/client";
import type { AppType } from "../lib/api";

// `worker-configuration.d.ts` declares every binding as a required
// `ProcessEnv` key, which is true inside the Worker and a lie here — this CLI
// runs on plain Bun, where the variable really can be absent.
// oxlint-disable-next-line typescript/no-unnecessary-condition
const API_BASE = process.env.BLOG_API_URL ?? "http://localhost:5173";

export function createClient(token: string) {
	return hc<AppType>(API_BASE, {
		headers: { Authorization: `Bearer ${token}` },
	});
}

export { API_BASE };
