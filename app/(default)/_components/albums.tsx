import { Result } from "better-result";
import * as v from "valibot";
import { safeFetchJson, safeParse } from "@/lib/safe-utils";

const albumSchema = v.object({
	title: v.string(),
	artist: v.string(),
	coverPath: v.string(),
});

const albumsSchema = v.array(albumSchema);

export async function Albums() {
	const result = await safeFetchJson("https://personal.solberg.club/random-albums", {
		signal: AbortSignal.timeout(3000),
	});
	const albums = Result.unwrapOr(Result.andThen(result, safeParse(albumsSchema)), []);

	return (
		<div className="-mx-6">
			<div className="inline-flex gap-3 overflow-y-auto px-6 md:grid md:w-full md:grid-cols-5 md:overflow-y-visible">
				{albums.map((album) => (
					<img
						key={`${album.artist}-${album.title}`}
						alt={`${album.title} by ${album.artist}`}
						src={`https://personal.solberg.club${album.coverPath}`}
						className="aspect-square w-24 rounded-sm object-cover shadow-lg sm:w-32 md:w-full"
					/>
				))}
			</div>
		</div>
	);
}
