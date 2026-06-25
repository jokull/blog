import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import cn from "clsx";
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
		],
		links: [{ rel: "alternate", type: "application/rss+xml", href: "/feed.xml" }],
	}),
	component: RootComponent,
});

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
				<Outlet />
				<Scripts />
			</body>
		</html>
	);
}
