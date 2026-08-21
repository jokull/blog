"use client";
import { Link, usePathname, useSearchParams } from "@/src/lib/navigation";
import { useMemo, useState } from "react";
import { groupBy, pipe } from "remeda";
import { twMerge } from "tailwind-merge";
import { PostLink } from "./post-link";

const DEFAULT_CATEGORY = "coding";

interface Category {
	slug: string;
	label: string;
}

interface Post {
	slug: string;
	title: string;
	locale: "is" | "en";
	categorySlug: string | null;
	/**
	 * The byline date degraded for the RSC wire: Temporal.PlainDate is not
	 * RSC-serializable, so it crosses as a Date at UTC midnight (Flight's
	 * native Date encoding). The calendar date is recovered with UTC getters
	 * / `timeZone: "UTC"` formatting — local-time formatting would shift the
	 * day on negative-offset machines.
	 */
	publicAt: Date;
}

interface PostListProps {
	posts: Post[];
	commentCounts: Record<string, number>;
	categories: Category[];
	/** Render the single stream (tabs + chronological list) at every breakpoint. */
	columns?: boolean;
}

function groupByYear(posts: Post[]) {
	const grouped = pipe(
		posts,
		groupBy((post) => String(post.publicAt.getUTCFullYear())),
	);
	const sortedYears = Object.keys(grouped).sort((a, b) => (b > a ? 1 : -1));
	return { grouped, sortedYears };
}

export function PostList({ posts, commentCounts, categories, columns = true }: PostListProps) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const [categorySlug, setCategorySlug] = useState(
		() => searchParams.get("category") ?? DEFAULT_CATEGORY,
	);
	const currentYear = String(new Date().getFullYear());

	const sortedCategories = useMemo(
		() =>
			[...categories].sort((a, b) => {
				if (a.slug === DEFAULT_CATEGORY) return -1;
				if (b.slug === DEFAULT_CATEGORY) return 1;
				return 0;
			}),
		[categories],
	);

	const mobileView = useMemo(() => {
		const filtered = posts.filter((p) => p.categorySlug === categorySlug);
		return groupByYear(filtered);
	}, [posts, categorySlug]);

	const desktopColumns = useMemo(
		() =>
			sortedCategories.map((category) => ({
				category,
				...groupByYear(posts.filter((p) => p.categorySlug === category.slug)),
			})),
		[posts, sortedCategories],
	);

	const handleCategoryChange = (value: string) => {
		setCategorySlug(value);
		const params = new URLSearchParams(searchParams.toString());
		if (value === DEFAULT_CATEGORY) {
			params.delete("category");
		} else {
			params.set("category", value);
		}
		const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
		window.history.replaceState(null, "", newUrl);
	};

	const tabs = (
		<div
			className={twMerge(
				"mb-7 inline-flex gap-0.5 rounded-lg p-0.5 inset-ring inset-ring-border",
				columns && "md:hidden",
			)}
		>
			{sortedCategories.map((category) => {
				const isSelected = category.slug === categorySlug;
				const href =
					category.slug === DEFAULT_CATEGORY
						? pathname
						: `${pathname}?category=${category.slug}`;
				return (
					<Link
						key={category.slug}
						href={href}
						onClick={(e) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
							e.preventDefault();
							handleCategoryChange(category.slug);
						}}
						className={twMerge(
							"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
							isSelected
								? "bg-primary text-primary-fg"
								: "text-fg hover:bg-secondary hover:text-secondary-fg",
						)}
					>
						{category.label}
					</Link>
				);
			})}
		</div>
	);

	const stream = mobileView.sortedYears.map((year) => (
		<div key={year} className="mb-7">
			{year !== currentYear && <h2 className="font-bold">{year}</h2>}
			<ul className="flex flex-col gap-3">
				{mobileView.grouped[year]?.map((item) => (
					<li key={item.slug}>
						<PostLink item={item} commentCount={commentCounts[item.slug] ?? 0} />
					</li>
				))}
			</ul>
		</div>
	));

	if (!columns) {
		return (
			<>
				{tabs}
				{stream}
			</>
		);
	}

	return (
		<>
			<div className="md:hidden">
				{tabs}
				{stream}
			</div>

			<div className="hidden gap-x-10 gap-y-10 md:grid md:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
				{desktopColumns.map(({ category, grouped, sortedYears }) => (
					<section key={category.slug} className="min-w-0">
						<h2 className="mb-5 font-bold text-base text-black">{category.label}</h2>
						{sortedYears.map((year) => (
							<div key={year} className="mb-6">
								{year !== currentYear && (
									<div className="mb-1 font-bold text-black/55 text-sm">
										{year}
									</div>
								)}
								<ul className="flex flex-col gap-3">
									{grouped[year]?.map((item) => (
										<li key={item.slug}>
											<PostLink
												item={item}
												commentCount={commentCounts[item.slug] ?? 0}
											/>
										</li>
									))}
								</ul>
							</div>
						))}
					</section>
				))}
			</div>
		</>
	);
}
