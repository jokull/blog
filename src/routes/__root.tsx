import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import cn from "clsx";
import { ResultRpcProvider } from "result-rpc/react";
import { asHead, siteHead } from "@/src/lib/seo";
import { client } from "@/src/rpc/client";
import { BoundaryProvider } from "@/src/rpc/shells";
import "../../app/globals.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
			{ title: "Jökull Sólberg" },
			{
				name: "description",
				content:
					"Personal blog about web development, technology, and software engineering",
			},
			{ name: "color-scheme", content: "only light" },
			{ name: "theme-color", content: "#fcfcfc" },
			...asHead({ ...siteHead(), links: [] }).meta,
		],
		links: [
			{
				rel: "alternate",
				type: "application/rss+xml",
				href: "/feed.xml",
				title: "Jökull Sólberg RSS Feed",
			},
		],
	}),
	component: RootComponent,
});

/**
 * The root owns the RPC transport, and nothing else about RPC.
 *
 * One client and one runtime for the whole app, so every subtree — including
 * the comment island, which mounts inside an RSC payload rather than the route
 * tree — reads and writes the same cache. `ResultRpcProvider` builds its
 * runtime in a ref, so SSR gets a fresh one per request and no cache is ever
 * shared between readers.
 *
 * `BoundaryProvider` belongs here for the same reason: transport pauses,
 * defect escalation and stale reloads are properties of the connection, not of
 * any one page, and none of them fetch anything.
 *
 * Identity deliberately does NOT live here. `SessionShell.Provider` issues a
 * `session` query on mount and renders its fallback until that query succeeds,
 * so mounting it at the root would put a blocking round trip in front of every
 * public page. It is mounted by the subtrees that actually need a viewer.
 */
function RootComponent() {
	return (
		<html lang="en" className="touch-manipulation">
			<head>
				<HeadContent />
			</head>
			<body
				className={cn(
					"relative",
					"text-sm leading-6 sm:text-[15px] sm:leading-7 md:text-base md:leading-7",
					"text-neutral-600",
					"antialiased",
				)}
			>
				<ResultRpcProvider client={client}>
					<BoundaryProvider>
						<Outlet />
					</BoundaryProvider>
				</ResultRpcProvider>
				<Scripts />
			</body>
		</html>
	);
}
