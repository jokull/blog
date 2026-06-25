import { GitHub, generateState } from "arctic";
import { getIronSession } from "iron-session";
import { getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { env } from "@/env";
import { fetchAuthenticatedUser, fetchGithubUser } from "@/lib/github";
import { throwRedirect } from "@/src/lib/router-control";

export function getOauthClient(redirectUri: string = "") {
	return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, redirectUri);
}

export { fetchAuthenticatedUser as whoami, fetchGithubUser as getGithubUser };

export async function requireAuth(currentUrl?: string) {
	const session = await getSession();
	if (!session.githubUsername) {
		// In development, redirect to dev auth route handler
		if (env.NODE_ENV === "development") {
			throwRedirect({ href: `/api/dev-auth?next=${encodeURIComponent(currentUrl ?? "/")}` });
		}

		const host = getRequestHeader("host");
		const callbackUrl = `https://${host}/callback?next=${encodeURIComponent(currentUrl ?? "/")}`;
		const github = getOauthClient(callbackUrl);

		const state = generateState();
		const scopes = ["user:email"];
		const authorizationURL = github.createAuthorizationURL(state, scopes);

		throwRedirect({ href: authorizationURL.toString() });
	}
	return session.githubUsername;
}

export async function isAdmin() {
	const session = await getSession();
	return session.githubUsername === "jokull";
}

export async function requireAdmin(currentUrl?: string) {
	const username = await requireAuth(currentUrl);
	if (username !== "jokull") {
		throw new Error("Admin access required");
	}
	return username;
}

export async function getSession() {
	type CookieOptions = NonNullable<Parameters<typeof setCookie>[2]>;
	type ResponseCookie = { name: string; value: string } & CookieOptions;
	type CookieStore = {
		get: (name: string) => { name: string; value: string } | undefined;
		set: {
			(name: string, value: string, cookie?: Partial<ResponseCookie>): void;
			(options: ResponseCookie): void;
		};
	};

	const setSessionCookie: CookieStore["set"] = (
		nameOrOptions: string | ResponseCookie,
		value?: string,
		cookie?: Partial<ResponseCookie>,
	) => {
		if (typeof nameOrOptions === "string") {
			setCookie(nameOrOptions, value ?? "", cookie);
			return;
		}

		const { name, value: cookieValue, ...options } = nameOrOptions;
		setCookie(name, cookieValue, options);
	};

	const cookieStore: CookieStore = {
		get: (name: string) => {
			const value = getCookie(name);
			return value ? { name, value } : undefined;
		},
		set: setSessionCookie,
	};

	return getIronSession<{
		githubUsername?: string;
	}>(cookieStore, {
		cookieName: "auth",
		password: env.GITHUB_CLIENT_SECRET,
		cookieOptions: {
			secure: env.NODE_ENV === "production",
			httpOnly: true,
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
		},
	});
}
