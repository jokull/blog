export function createPostEtag(revision: number): string {
	return `"post-${revision}"`;
}

function normalizePostEtag(etag: string): string {
	return etag.startsWith("W/") ? etag.slice(2) : etag;
}

export function matchesPostEtag(ifMatch: string, currentEtag: string): boolean {
	const normalizedCurrent = normalizePostEtag(currentEtag);
	return ifMatch
		.split(",")
		.map((candidate) => candidate.trim())
		.some(
			(candidate) => candidate === "*" || normalizePostEtag(candidate) === normalizedCurrent,
		);
}
