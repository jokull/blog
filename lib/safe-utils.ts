/**
 * The outbound-HTTP boundary, as Results.
 *
 * Built on `result-rpc`'s `Result`, the same dialect the wire uses — it is a
 * general-purpose value type, not something that only exists between a handler
 * and a client — so a failure from `safeFetchJson` composes with `gen`,
 * `matchError` and an RPC handler's own error union with no translation step.
 *
 * Every error here is `visibility: "private"`. Private errors are server-side
 * composition currency: the framework refuses to put them on the wire, so a
 * handler has to fold one into a declared public tag before returning it. That
 * is what stops a GitHub 404 from leaking out of this blog as a `fetch/status`
 * the browser was never told about.
 */
import { Result } from "better-result";
import { defineErrors, err, ok, validateStandard, wire, type StandardSchemaV1 } from "result-rpc";

const messageOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));

export const fetchErrors = defineErrors("fetch", {
	/** The request never completed: DNS, TLS, timeout, abort. */
	unreachable: {
		data: wire.object({ url: wire.string, message: wire.string }),
		visibility: "private",
		retry: "transient",
	},
	/** A response arrived, but not a 2xx. */
	status: {
		data: wire.object({ url: wire.string, status: wire.number }),
		visibility: "private",
	},
	/** A 2xx arrived whose body would not parse as JSON. */
	malformed: {
		data: wire.object({ url: wire.string, message: wire.string }),
		visibility: "private",
	},
});

export const schemaErrors = defineErrors("schema", {
	invalid: {
		data: wire.object({ issues: wire.array(wire.string) }),
		visibility: "private",
	},
});

export type FetchError = ReturnType<typeof fetchErrors.unreachable>;
export type FetchJsonError = ReturnType<(typeof fetchErrors)[keyof typeof fetchErrors]>;
export type SchemaError = ReturnType<typeof schemaErrors.invalid>;

/** Safe fetch: a transport failure becomes a value rather than a rejection. */
export async function safeFetch(
	input: URL | string,
	init?: RequestInit,
): Promise<Result<Response, FetchError>> {
	return Result.tryPromise({
		try: () => fetch(input, init),
		catch: (cause) =>
			fetchErrors.unreachable({ url: String(input), message: messageOf(cause) }, { cause }),
	});
}

/**
 * Fetch plus JSON, with the three failure modes named separately — a caller
 * that wants to retry only on `fetch/unreachable` can, and one that does not
 * care collapses them with a single `matchError`.
 */
export async function safeFetchJson<T = unknown>(
	input: URL | string,
	init?: RequestInit,
): Promise<Result<T, FetchJsonError>> {
	return Result.gen(async function* () {
		const response = yield* await safeFetch(input, init);

		if (!response.ok) {
			return yield* err(fetchErrors.status({ url: String(input), status: response.status }));
		}

		const body = yield* await Result.tryPromise({
			// `Response.json()` is generic in the workers types, so `T` is supplied
			// by inference rather than an assertion.
			try: () => response.json<T>(),
			catch: (cause) =>
				fetchErrors.malformed({ url: String(input), message: messageOf(cause) }, { cause }),
		});

		return ok(body);
	});
}

/**
 * Fetch plus plain text — the sibling of `safeFetchJson` for endpoints that
 * do not speak JSON. Same three failure modes, same private tags.
 */
export async function safeFetchText(
	input: URL | string,
	init?: RequestInit,
): Promise<Result<string, FetchJsonError>> {
	return Result.gen(async function* () {
		const response = yield* await safeFetch(input, init);

		if (!response.ok) {
			return yield* err(fetchErrors.status({ url: String(input), status: response.status }));
		}

		const text = yield* await Result.tryPromise({
			try: () => response.text(),
			catch: (cause) =>
				fetchErrors.malformed({ url: String(input), message: messageOf(cause) }, { cause }),
		});

		return ok(text);
	});
}

/**
 * Classifies a fetch boundary failure for a handler fold. An upstream that
 * answered wrong — non-2xx, a malformed body, or a payload that fails schema
 * validation — is a defect, so it is logged as an incident and the fold should
 * cloak it behind a declared tag; genuine offline is the retryable, silent
 * lane. Returns true for offline so the fold can pick the tag.
 */
export const isFetchUnreachable = (e: FetchJsonError | SchemaError): boolean => {
	if (fetchErrors.unreachable.is(e)) return true;

	if (fetchErrors.status.is(e)) {
		console.error(`[fetch] upstream ${e.data.status} ${e.data.url}`);
	} else if (fetchErrors.malformed.is(e)) {
		console.error(`[fetch] malformed body ${e.data.url}: ${e.data.message}`);
	} else {
		console.error(`[fetch] schema/invalid ${e.data.issues.join(", ")}`);
	}
	return false;
};

/**
 * Schema validation as a Result-returning step, for use with `andThen`/`gen`.
 *
 * Takes any Standard Schema rather than a Zod schema specifically. In practice
 * that means Valibot — the same schemas feed Formisch and `wire.standard` — but
 * nothing here is bound to a vendor, which is the point of routing through
 * `validateStandard`.
 */
export function safeParse<TOutput>(
	schema: StandardSchemaV1<unknown, TOutput>,
): (data: unknown) => Result<TOutput, SchemaError> {
	return (data: unknown) => {
		const validated = validateStandard(schema, data);
		return validated.ok
			? ok(validated.value)
			: err(
					schemaErrors.invalid({
						issues: Object.entries(validated.fields).flatMap(([field, messages]) =>
							messages.map((message) => `${field || "(root)"}: ${message}`),
						),
					}),
				);
	};
}
