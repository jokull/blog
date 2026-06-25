import { Image } from "@/src/lib/navigation";

export function Hero() {
	return (
		<div className="mb-10 flex max-w-2xl items-start gap-5 sm:mb-12 sm:gap-6">
			<Image
				src="/baldur-square.jpg"
				width={288}
				height={288}
				quality={95}
				alt="Jökull Sólberg"
				className="size-20 shrink-0 rounded-2xl shadow-lg ring-1 ring-white/60 sm:size-24"
				priority
			/>
			<div className="flex min-w-0 flex-col gap-1.5">
				<h1 className="font-bold text-black text-lg leading-tight sm:text-xl">
					Jökull Sólberg
				</h1>
				<p className="text-balance text-black/75 text-sm leading-snug sm:text-[15px]">
					<strong className="font-semibold text-black">
						Co-founder and CTO of TripToJapan.com.
					</strong>{" "}
					This blog runs in two modes:{" "}
					<strong className="font-semibold text-black">
						helpful posts about TypeScript, agents, and the guts of shipping software
					</strong>
					, and{" "}
					<strong className="font-semibold text-black">
						much less helpful ones about Icelandic politics and the end of the
						Atlanticist order
					</strong>
					. The overlap in readership is approximately zero, and I've made peace with
					that. Reykjavík, Iceland.
				</p>
			</div>
		</div>
	);
}
