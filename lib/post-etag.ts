export function createPostEtag(revision: number): string {
	return `"post-${revision}"`;
}

export function matchesPostEtag(ifMatch: string, currentEtag: string): boolean {
	return ifMatch
		.split(",")
		.map((candidate) => candidate.trim())
		.some((candidate) => candidate === "*" || candidate === currentEtag);
}
