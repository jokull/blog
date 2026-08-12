import { Result } from "better-result";
import * as v from "valibot";
import { safeFetchJson, safeParse } from "@/lib/safe-utils";

const showSchema = v.object({
	title: v.string(),
	thumb: v.string(),
	poster: v.string(),
});

const showsSchema = v.array(showSchema);

export async function RecentShows() {
	const result = await safeFetchJson("https://personal.solberg.club/recent-shows", {
		signal: AbortSignal.timeout(3000),
	});
	const shows = Result.unwrapOr(Result.andThen(result, safeParse(showsSchema)), []);

	return (
		<div className="-mx-6 flex gap-3 overflow-y-auto px-6 sm:grid sm:grid-cols-3 md:grid-cols-5 *:shrink-0 sm:*:w-auto">
			{shows.map((show) => (
				<div key={show.title} className="flex flex-col gap-1 shadow-lg">
					<div className="w-full overflow-hidden rounded">
						<img
							src={`https://personal.solberg.club${show.poster}`}
							alt={show.title}
							className="aspect-10/16 h-full w-24 object-cover sm:w-32"
						/>
					</div>
				</div>
			))}
		</div>
	);
}
