import cn from "clsx";
import type { Metadata, Viewport } from "@/src/lib/metadata";

import "./globals.css";

export const metadata: Metadata = {
	title: {
		template: "%s - Jökull Sólberg",
		default: "Jökull Sólberg",
	},
	description: "Personal blog about web development, technology, and software engineering",
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Jökull Sólberg",
	},
	alternates: {
		types: {
			"application/rss+xml": [
				{
					url: "/feed.xml",
					title: "Jökull Sólberg RSS Feed",
				},
			],
		},
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	colorScheme: "only light",
	themeColor: "#fcfcfc",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="touch-manipulation">
			<body
				className={cn(
					"relative",
					"text-sm leading-6 sm:text-[15px] sm:leading-7 md:text-base md:leading-7",
					"text-neutral-600",
					"antialiased",
				)}
			>
				{children}
			</body>
		</html>
	);
}
