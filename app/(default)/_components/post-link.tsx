import { Link } from "@/src/lib/navigation";

export interface PostLinkItem {
	slug: string;
	title: string;
	locale: "is" | "en";
	/**
	 * The byline date degraded for the RSC wire: Temporal.PlainDate is not
	 * RSC-serializable, so it crosses as a Date at UTC midnight (Flight's
	 * native Date encoding). The calendar date is recovered with UTC getters
	 * / `timeZone: "UTC"` formatting — local-time formatting would shift the
	 * day on negative-offset machines.
	 */
	publicAt: Date;
}

export function PostLink({
	item,
	commentCount,
	showYear = false,
}: {
	item: PostLinkItem;
	commentCount: number;
	showYear?: boolean;
}) {
	const currentYear = new Date().getUTCFullYear();
	const year = item.publicAt.getUTCFullYear();
	// UTC-midnight Date: format in UTC so the calendar date survives. Show the
	// year when asked, or whenever it isn't the current one (no year-group
	// headers in a merged stream to carry that context).
	const formattedDate = item.publicAt.toLocaleDateString(item.locale, {
		month: "short",
		day: "numeric",
		...(showYear || year !== currentYear ? { year: "numeric" } : {}),
		timeZone: "UTC",
	});

	return (
		<Link
			href={`/${item.slug}`}
			className="group flex items-end justify-between gap-1"
			draggable={false}
		>
			<span className="block font-medium text-black/85 leading-snug group-hover:text-black">
				{item.title}
			</span>
			<span className="dot-leaders mb-[0.1rem] min-w-4 flex-1 font-normal text-black/10 text-sm leading-none transition-colors group-hover:text-black/25 group-hover:transition-none" />
			<span className="flex shrink-0 items-center gap-1.5 self-start">
				<time className="block whitespace-nowrap font-normal text-black/40 tabular-nums tracking-tighter transition-colors group-hover:text-black/55 group-hover:transition-none">
					{formattedDate}
				</time>
				{commentCount > 0 && (
					<>
						<span className="sr-only">
							{commentCount} {commentCount === 1 ? "comment" : "comments"}
						</span>
						<svg
							aria-hidden="true"
							width="20"
							height="16"
							viewBox="0 0 20 16"
							className="shrink-0 text-black/40 transition-colors group-hover:text-black/55 group-hover:transition-none"
						>
							<path
								d="M3 1.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-8L5.5 14v-2.5H3A1.5 1.5 0 0 1 1.5 10V3A1.5 1.5 0 0 1 3 1.5z"
								fill="currentColor"
								fillOpacity="0.08"
								stroke="currentColor"
								strokeWidth="1"
							/>
							<text
								x="10"
								y="6.5"
								textAnchor="middle"
								dominantBaseline="middle"
								fontSize="8"
								fontWeight="600"
								fill="currentColor"
							>
								{commentCount}
							</text>
						</svg>
					</>
				)}
			</span>
		</Link>
	);
}
