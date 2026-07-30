import { Result, TaggedError } from "better-result";
import type { z, ZodSchema } from "zod";

export class FetchError extends TaggedError("FetchError")<{
	message: string;
	cause: unknown;
}>() {}

export class HttpError extends TaggedError("HttpError")<{
	message: string;
	status: number;
	headers: Headers;
	json?: unknown;
}>() {}

export class ParseError extends TaggedError("ParseError")<{
	message: string;
	cause: unknown;
}>() {}

export class ZodParseError extends TaggedError("ZodParseError")<{
	message: string;
	errors: z.ZodError;
}>() {}

export type FetchJsonError = FetchError | HttpError | ParseError;

/**
 * Safe wrapper around Zod schema parsing that returns a Result type
 * instead of throwing errors.
 */
export function safeZodParse<TSchema extends ZodSchema>(
	schema: TSchema,
): (data: unknown) => Result<z.infer<TSchema>, ZodParseError> {
	return (data: unknown) => {
		const result = schema.safeParse(data);
		return result.success
			? Result.ok(result.data)
			: Result.err(
					new ZodParseError({ message: result.error.message, errors: result.error }),
				);
	};
}

/**
 * Safe wrapper around fetch that returns a Result with typed errors.
 */
export async function safeFetch(
	input: URL | string,
	init?: RequestInit,
): Promise<Result<Response, FetchError>> {
	return Result.tryPromise({
		try: () => fetch(input, init),
		catch: (cause) =>
			new FetchError({
				message: cause instanceof Error ? cause.message : String(cause),
				cause,
			}),
	});
}

/**
 * Safe wrapper around fetch + JSON parsing with typed errors.
 */
export async function safeFetchJson<T = unknown>(
	input: URL | string,
	init?: RequestInit,
): Promise<Result<T, FetchJsonError>> {
	const fetchResult = await safeFetch(input, init);
	if (fetchResult.isErr()) return fetchResult;

	const response = fetchResult.value;

	if (!response.ok) {
		const json: unknown = await response.json().catch(() => undefined);
		return Result.err(
			new HttpError({
				message: `HTTP ${response.status}`,
				status: response.status,
				headers: response.headers,
				json,
			}),
		);
	}

	return Result.tryPromise({
		// `Response.json()` is generic in the current workers types, so `T` is
		// supplied by inference rather than an assertion.
		try: () => response.json<T>(),
		catch: (cause) =>
			new ParseError({
				message: cause instanceof Error ? cause.message : String(cause),
				cause,
			}),
	});
}
