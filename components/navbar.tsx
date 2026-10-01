"use client";

import cn from "clsx";
import { Image, Link, usePathname } from "@/src/lib/navigation";

function Item(props: React.ComponentProps<typeof Link>) {
	const pathname = usePathname();
	const href = props.href;

	if (typeof href !== "string") {
		throw new Error("`href` must be a string");
	}

	const isActive = pathname === href || pathname.startsWith(`${href}/`);

	return (
		<div
			className={cn(
				isActive ? "text-blue-800" : "text-blue-500 hover:text-blue-600",
				"leading-tight",
			)}
		>
			<Link {...props} className="block w-full" draggable={false} />
		</div>
	);
}

export default function Navbar() {
	return (
		<nav className="mobile:mr-3 mobile:w-32 w-full font-sans sm:mr-5 md:mr-7">
			<div className="mobile:sticky top-6 mb-6 mobile:mb-0 w-full sm:top-10 md:top-14">
				<a href="/" className="mb-8 flex flex-col gap-3 mobile:items-end">
					<Image
						src="/baldur-square.jpg"
						width={288}
						height={288}
						quality={95}
						alt=""
						className="size-20 rounded-2xl shadow-lg ring-1 ring-white/60 sm:size-24"
						priority
					/>
					<span className="whitespace-nowrap font-bold text-base text-black leading-tight">
						Jökull Sólberg
					</span>
				</a>
				<div className="flex flex-col gap-2 text-right">
					<Item href="/blog">blog</Item>
					<Item href="/notes">notes</Item>
					<Item href="/projects">projects</Item>
					<a
						href="mailto:jokull@solberg.is"
						className="text-blue-500 hover:text-blue-600 leading-tight block w-full"
					>
						email
					</a>
					<Item href="https://x.com/jokull">x.com/jokull</Item>
					<Item href="https://github.com/jokull/blog">source</Item>
					<a
						href="https://calendar.app.google/CbGee9NZCYu7gKhLA"
						target="_blank"
						rel="noopener"
						className="text-blue-500 hover:text-blue-600 leading-tight block w-full"
					>
						meeting
					</a>
				</div>
			</div>
		</nav>
	);
}
