import { describe, expect, it } from "bun:test";
import { createPostEtag, matchesPostEtag } from "./post-etag";

describe("post ETags", () => {
	it("creates a quoted strong ETag from the revision", () => {
		expect(createPostEtag(12)).toBe('"post-12"');
	});

	it("matches the current ETag in an If-Match list", () => {
		expect(matchesPostEtag('"post-11", "post-12"', '"post-12"')).toBe(true);
	});

	it("accepts the If-Match wildcard", () => {
		expect(matchesPostEtag("*", '"post-12"')).toBe(true);
	});

	it("accepts Cloudflare's weak form of the current ETag", () => {
		expect(matchesPostEtag('W/"post-12"', '"post-12"')).toBe(true);
		expect(matchesPostEtag('"post-12"', 'W/"post-12"')).toBe(true);
	});

	it("rejects stale ETags", () => {
		expect(matchesPostEtag('"post-11"', '"post-12"')).toBe(false);
	});
});
