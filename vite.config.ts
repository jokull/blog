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
				exclude: ["safe-mdx", "@tanstack/start-server-core"],
				include: [
					"boolbase",
					"cssom",
					"eval-estree-expression",
					"extend",
					// The rsc optimizer discovers node_modules imports one pass at
					// a time, and @cloudflare/vite-plugin forces discovery on —
					// each pass triggers "optimized dependencies changed",
					// reloading the page and recompiling. The TanStack subpath
					// imports (one per server-rpc/router helper) each cost a
					// pass; prebundling them at startup collapses the multi-
					// minute cascade to a single startup pass (verified on the
					// tursopg experiment branch: 0 reloads, cold start <15s).
					// devalue + temporal-polyfill are the RSC payload serializer
					// deps, same story.
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
				include: ["cssom"],
			},
		},
	},
});
