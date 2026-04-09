import Navbar from "@/components/navbar";
import { env } from "@/env";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="w-full overflow-x-clip p-6 sm:p-10 md:p-14">
			<div className="pointer-events-none fixed top-0 left-0 z-30 h-6 w-full content-fade-out sm:hidden sm:h-10 md:h-14" />
			<div className="flex mobile:flex-row flex-col mobile:items-stretch">
				<Navbar />
				<main className="relative flex-1 [contain:inline-size]">
					<div className="absolute mobile:right-auto right-0 mobile:left-0 h-px mobile:h-full mobile:w-px w-full bg-blue-border mobile:opacity-100 opacity-50" />
					<article className="mobile:pt-0 pt-6 mobile:pl-6 pl-0 sm:pl-10 md:pl-14">
						{children}
					</article>
				</main>
			</div>
			{env.NODE_ENV === "production" ? (
				<script defer src="https://assets.onedollarstats.com/stonks.js" />
			) : null}
		</div>
	);
}
