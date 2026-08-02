/**
 * GitHub's user API, as Results.
 *
 * Both return a Result rather than throwing, so "this token is not valid" is a
 * value the session middleware can turn into "anonymous" without a catch block,
 * and the reason survives the trip.
 */
import { andThen, type Result } from "result-rpc";
import * as v from "valibot";
import { safeFetchJson, safeParse, type FetchJsonError, type SchemaError } from "./safe-utils";

export const githubUserSchema = v.object({
	email: v.nullable(v.string()),
	id: v.number(),
	login: v.string(),
	name: v.nullable(v.string()),
	avatar_url: v.string(),
});

export type GitHubUser = v.InferOutput<typeof githubUserSchema>;
export type GitHubError = FetchJsonError | SchemaError;

const GITHUB_HEADERS = {
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
	"User-Agent": "solberg-blog",
} as const;

export async function fetchAuthenticatedUser(
	accessToken: string,
): Promise<Result<GitHubUser, GitHubError>> {
	const response = await safeFetchJson("https://api.github.com/user", {
		headers: { ...GITHUB_HEADERS, Authorization: `Bearer ${accessToken}` },
	});
	return andThen(response, safeParse(githubUserSchema));
}

export async function fetchGithubUser(username: string): Promise<Result<GitHubUser, GitHubError>> {
	const response = await safeFetchJson(`https://api.github.com/users/${username}`, {
		headers: GITHUB_HEADERS,
		signal: AbortSignal.timeout(3000),
	});
	return andThen(response, safeParse(githubUserSchema));
}
