import { PuddleLogo } from "./puddle-logo";

export function Hero() {
	return (
		<div className="mb-10 max-w-xl sm:mb-12">
			<div className="flex min-w-0 flex-col gap-1.5">
				<h1 className="-mt-4 -mb-3 -ml-5">
					<PuddleLogo className="block h-auto w-100 max-w-full" />
					<span className="sr-only">Jökull Sólberg</span>
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
