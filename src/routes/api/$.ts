import { createFileRoute } from "@tanstack/react-router";
import { app } from "@/lib/api";

const handler = ({ request }: { request: Request }) => app.fetch(request);

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
			PATCH: handler,
			DELETE: handler,
		},
	},
});
