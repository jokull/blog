/**
 * The link checker.
 *
 * A mutation rather than a query, because it fetches every outbound URL in
 * every post and only ever runs from this button — a query would invite the
 * cache to refetch it on focus. `useMutation` tracks both pending and the last
 * result, so the panel needs no `useTransition`/`useState` of its own.
 */
import { Link } from "@/src/lib/navigation";
import { client } from "@/src/rpc/client";
import { AdminShell } from "../shells";

export function BrokenLinksPanel() {
	const check = AdminShell.useMutation(client.links.check);
	const isPending = check.state === "pending";
	const results = check.state === "success" ? check.value : null;

	return (
		<div className="rounded-lg border p-6">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-xl">Broken Links &amp; Images</h2>
				<button
					type="button"
					onClick={() => {
						check.mutate({});
					}}
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
							{results.map((link, index) => (
								<div
									key={`${link.postSlug}-${link.url}-${index}`}
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
										{link.status.kind === "unreachable"
											? "ERR"
											: link.status.code}
									</span>
									<div className="min-w-0">
										<Link
											href={`/${link.postSlug}`}
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
