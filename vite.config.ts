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
	optimizeDeps: {
		exclude: ["safe-mdx"],
	},
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
				exclude: ["safe-mdx"],
				include: ["boolbase", "cssom", "eval-estree-expression", "extend"],
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
