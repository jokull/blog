"use client";

import type { BrokenLink } from "@/lib/link-checker";
import { Link } from "@/src/lib/navigation";
import { useTransition, useState } from "react";
import { runLinkChecker } from "../actions";

export function BrokenLinksPanel() {
	const [results, setResults] = useState<BrokenLink[] | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleRun = () => {
		startTransition(async () => {
			const brokenLinks = await runLinkChecker();
			setResults(brokenLinks);
		});
	};

	return (
		<div className="rounded-lg border p-6">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-xl">Broken Links & Images</h2>
				<button
					type="button"
					onClick={handleRun}
					disabled={isPending}
					className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
				>
					{isPending ? "Checking..." : results ? "Re-check" : "Run check"}
				</button>
			</div>

			{isPending && (
				<div className="mt-4 animate-pulse text-neutral-400">
					Scanning all posts for broken links and images...
				</div>
			)}

			{results !== null && !isPending && (
				<div className="mt-4">
					{results.length === 0 ? (
						<p className="text-green-600">All links and images are healthy.</p>
					) : (
						<div className="space-y-3">
							<p className="text-red-500 text-sm">{results.length} issues found</p>
							{results.map((link, i) => (
								<div
									key={`${link.postSlug}-${link.url}-${i}`}
									className="flex items-start gap-3 text-sm"
								>
									<span
										className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${
											link.type === "image"
												? "bg-amber-100 text-amber-700"
												: "bg-red-100 text-red-700"
										}`}
									>
										{link.type === "image" ? "IMG" : "LINK"}{" "}
										{link.status === "error" ? "ERR" : link.status}
									</span>
									<div className="min-w-0">
										<Link
											href={`/${link.postSlug}/editor`}
											className="font-medium text-blue-600 hover:underline"
										>
											{link.postTitle}
										</Link>
										<div className="truncate text-neutral-500">{link.url}</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
