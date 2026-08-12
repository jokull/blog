import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const safeMdxDynamicEsmStub = fileURLToPath(
	new URL("./src/lib/safe-mdx-dynamic-esm-stub.tsx", import.meta.url),
);

export default defineConfig({
	// No client `optimizeDeps` entry for `safe-mdx`: nothing in the browser graph
	// reaches it. Posts and comment bodies are both rendered on the server (see
	// `src/blog/comment-markdown.ts`), so the client never needs the CJS-interop
	// `include: ["fault", "format"]` that bundling safe-mdx would demand. If those
	// entries become necessary again, something has crossed back over.
	resolve: {
		alias: {
			"@": fileURLToPath(new URL(".", import.meta.url)),
			ui: fileURLToPath(new URL("./components/ui", import.meta.url)),
		},
	},
	plugins: [
		cloudflare({
			viteEnvironment: {
				name: "ssr",
				childEnvironments: ["rsc"],
			},
		}),
		tanstackStart({
			rsc: {
				enabled: true,
			},
		}),
		rsc(),
		{
			name: "safe-mdx-rsc-dynamic-esm-stub",
			resolveId(id, importer) {
				if (
					id === "./dynamic-esm-component.js" &&
					importer?.includes("/node_modules/safe-mdx/")
				) {
					return safeMdxDynamicEsmStub;
				}
			},
		},
		viteReact(),
		tailwindcss(),
	],
	environments: {
		rsc: {
			optimizeDeps: {
				// `@tanstack/start-server-core` resolves `#tanstack-router-entry`
				// and `#tanstack-start-entry`, subpath imports the Start plugin
				// supplies through Vite's resolver. The dep optimizer runs on
				// rolldown, which does not see those, so prebundling it fails with
				// "Package import specifier is not defined" and every route
				// rendered through it 500s. Excluding it leaves the resolution
				// to Vite, where it works.
				//
				// The pg subtree is included so it prebundles at startup:
				// @cloudflare/vite-plugin forces `noDiscovery: false` on its
				// environments (its dev resolver calls
				// `depsOptimizer.registerMissingImport()` per unresolved import),
				// so anything not prebundled gets bundled mid-request by
				// discovery — the "optimized dependencies changed" churn. pg is
				// CJS; excluding it (as tried) instead makes workerd statically
				// resolve its optional `require("pg-native")`, which fails. The
				// prebundler tolerates that require; discovery does not.
				exclude: ["safe-mdx", "@tanstack/start-server-core"],
				include: [
					"boolbase",
					"cssom",
					"eval-estree-expression",
					"extend",
					// The rsc optimizer discovers node_modules imports one pass at
					// a time, and the plugin forces discovery on — every pass
					// triggers "optimized dependencies changed", reloading the
					// page and recompiling. The TanStack subpath imports (one per
					// server-rpc/router helper) each cost a pass; prebundling
					// them at startup collapses the multi-minute cascade to a
					// single startup pass (verified in a minimal repro: 4
					// subpaths → 3 reloads → 0). devalue + temporal-polyfill are
					// the RSC payload serializer deps, same story.
					"@tanstack/start-server-core/createServerRpc",
					"@tanstack/router-core",
					"@tanstack/router-core/isServer",
					"@tanstack/router-core/ssr/server",
					"@tanstack/start-client-core",
					"@tanstack/start-storage-context",
					"@tanstack/history",
					"h3-v2",
					"seroval",
					"devalue",
					"temporal-polyfill/global",
					// node-postgres is CJS and never reaches the client; prebundle
					// it deterministically at startup (the bundler tolerates the
					// optional pg-native require) instead of letting first-request
					// discovery bundle it mid-request, which hung for minutes.
					"pg",
					"pg-pool",
					"pg-protocol",
					"pg-types",
					"pgpass",
					"pg-connection-string",
					"pg-int8",
					"pg-cloudflare",
					"postgres-array",
					"postgres-bytea",
					"postgres-date",
					"postgres-interval",
					"split2",
					"xtend",
				],
			},
			build: {
				rollupOptions: {
					external: ["cloudflare:workers"],
				},
			},
		},
		ssr: {
			build: {
				rollupOptions: {
					external: ["cloudflare:workers"],
				},
			},
			optimizeDeps: {
				exclude: ["safe-mdx"],
				include: [
					"cssom",
					"pg",
					"pg-pool",
					"pg-protocol",
					"pg-types",
					"pgpass",
					"pg-connection-string",
					"pg-int8",
					"pg-cloudflare",
					"postgres-array",
					"postgres-bytea",
					"postgres-date",
					"postgres-interval",
					"split2",
					"xtend",
				],
			},
		},
	},
});
