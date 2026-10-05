import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	accountId: "561f024b3ba2bbafa2a67ec9b911693c",
	worker: {
		name: "solberg-blog",
		compatibilityDate: "2026-02-28",
		compatibilityFlags: ["nodejs_compat"],
		entrypoint: "@tanstack/react-start/server-entry",
		placement: {
			mode: "targeted",
			region: "aws:eu-west-1",
		},
		observability: {
			logs: {
				enabled: true,
				invocationLogs: true,
			},
		},
		assets: {
			notFoundHandling: "none",
		},
		domains: ["www.solberg.is"],
		env: {
			SITE_URL: bindings.text("https://www.solberg.is"),
			GITHUB_CLIENT_ID: bindings.text("Ov23licJONCc4hbUWRuK"),
			// Secrets: declared for typing only. Values are never in the repo; set
			// them with `wrangler secret put` / the dashboard.
			GITHUB_CLIENT_SECRET: bindings.secret(),
			ONEDOLLARSTATS_API_KEY: bindings.secret(),
			DB: bindings.d1({
				name: "solberg-blog",
				id: "51a6e936-c76d-43d9-8633-b412ad365dba",
			}),
		},
	},
});
