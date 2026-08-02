/**
 * The RPC endpoint as a TanStack Start server route.
 *
 * `server.handlers` bodies are stripped from the client build, which is why
 * importing ../rpc/server (D1 + iron-session + every handler) is safe
 * here and nowhere a component can reach.
 */
import { createFileRoute } from "@tanstack/react-router";
import { rpcHandler } from "@/src/rpc/server";

export const Route = createFileRoute("/api/rpc")({
	server: {
		handlers: {
			POST: ({ request }) => rpcHandler(request),
		},
	},
});
