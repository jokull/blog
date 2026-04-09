"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { groupBy, pipe } from "remeda";

const DEFAULT_CATEGORY = "coding";

interface Category {
	slug: string;
	label: string;
}

interface Post {
	slug: string;
	title: string;
	publishedAt: Date;
	locale: "is" | "en";
	categorySlug: string | null;
	formattedDate: string;
	year: string;
}

interface PostListProps {
	posts: Post[];
	commentCounts: Record<string, number>;
	categories: Category[];
}

interface PostLinkProps {
	item: Post;
	commentCount: number;
}

function PostLink({ item, commentCount }: PostLinkProps) {
	return (
		<Link
			href={`/${item.slug}`}
			className="group flex items-end justify-between gap-1"
			draggable={false}
		>
			<span className="block font-medium text-black/85 leading-snug group-hover:text-black">
				{item.title}
			</span>
			<span className="dot-leaders mb-[0.1rem] flex-1 font-normal text-black/10 text-sm leading-none transition-colors group-hover:text-black/25 group-hover:transition-none" />
			<span className="flex shrink-0 items-center gap-1.5 self-start">
				<time className="block whitespace-nowrap font-normal text-black/40 tabular-nums tracking-tighter transition-colors group-hover:text-black/55 group-hover:transition-none">
					{item.formattedDate}
				</time>
				{commentCount > 0 && (
					<svg
						role="img"
						aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
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
				)}
			</span>
		</Link>
	);
}

function groupByYear(posts: Post[]) {
	const grouped = pipe(
		posts,
		groupBy((post) => post.year),
	);
	const sortedYears = Object.keys(grouped).sort((a, b) => (b > a ? 1 : -1));
	return { grouped, sortedYears };
}

export function PostList({ posts, commentCounts, categories }: PostListProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const categorySlug = searchParams.get("category") ?? DEFAULT_CATEGORY;
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
		const params = new URLSearchParams(searchParams.toString());
		if (value === DEFAULT_CATEGORY) {
			params.delete("category");
		} else {
			params.set("category", value);
		}
		const newUrl = params.toString() ? `/?${params.toString()}` : "/";
		router.replace(newUrl, { scroll: false });
	};

	return (
		<>
			<div className="md:hidden">
				<div className="mb-7">
					<ToggleGroup
						selectionMode="single"
						selectedKeys={[categorySlug]}
						onSelectionChange={(keys) => {
							const selected = Array.from(keys)[0];
							if (selected) {
								handleCategoryChange(String(selected));
							}
						}}
					>
						{sortedCategories.map((category) => (
							<ToggleGroupItem key={category.slug} id={category.slug}>
								{category.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>

				{mobileView.sortedYears.map((year) => (
					<div key={year} className="mb-7">
						{year !== currentYear && <h2 className="font-bold">{year}</h2>}
						<ul className="flex flex-col gap-3">
							{mobileView.grouped[year]?.map((item) => (
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
