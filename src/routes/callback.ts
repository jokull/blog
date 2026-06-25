import { createFileRoute } from "@tanstack/react-router";
import { getOauthClient, getSession, whoami } from "@/auth";

export const Route = createFileRoute("/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const code = url.searchParams.get("code");
				const nextUrl = url.searchParams.get("next");

				const callbackUrl = nextUrl
					? `${url.origin}/callback?next=${encodeURIComponent(nextUrl)}`
					: `${url.origin}/callback`;
				const github = getOauthClient(callbackUrl);

				if (!code) {
					return Response.json({ error: "missing_code" }, { status: 400 });
				}

				try {
					const tokens = await github.validateAuthorizationCode(code);
					const accessToken = tokens.accessToken();
					const user = await whoami(accessToken);

					const session = await getSession();
					session.githubUsername = user.login;
					await session.save();

					const redirectUrl = nextUrl ? decodeURIComponent(nextUrl) : "/";
					return Response.redirect(new URL(redirectUrl, request.url).toString(), 302);
				} catch (error) {
					return Response.json(
						{
							error: error instanceof Error ? error.message : String(error),
							callbackUrl,
						},
						{ status: 500 },
					);
				}
			},
		},
	},
});
