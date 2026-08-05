"use client";

/**
 * The "you're offline" banner, driven by result-rpc's honest two-source signal.
 *
 * `navigator.onLine` is a hint that can lie "true" (captive portals), so the
 * banner trusts it only for the *cause* side and lets the transport shell's
 * held failures be the *proof* side:
 *
 *   offline   — the browser says we're offline. Saves pause; held operations
 *               are queued and the query engine retries them on reconnect.
 *   degraded  — the browser claims online but requests are provably failing.
 *               Held operations are being retried automatically; the Retry
 *               button calls `resume()` to re-run them now.
 *
 * In both states nothing was lost: transport failures are held by the shell,
 * not error-rendered, so a save made offline re-fires once the connection
 * returns.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useConnectivity } from "@/src/rpc/shells";

const bannerMotion = {
	type: "spring",
	bounce: 0.2,
	visualDuration: 0.32,
} as const;

export function OfflineBanner() {
	const { status, held, resume } = useConnectivity();
	const reduceMotion = useReducedMotion();

	return (
		<AnimatePresence>
			{status !== "online" && (
				<motion.output
					initial={reduceMotion ? false : { opacity: 0, y: -14 }}
					animate={{ opacity: 1, y: 0 }}
					exit={reduceMotion ? undefined : { opacity: 0, y: -14 }}
					transition={bannerMotion}
					className="fixed inset-x-0 top-0 z-50 border-b border-warning/25 bg-warning-subtle/95 text-warning-subtle-fg shadow-xs backdrop-blur-md"
				>
					<div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2 sm:gap-4 sm:px-6">
						<StatusDot offline={status === "offline"} reduceMotion={reduceMotion} />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium leading-5">
								{status === "offline" ? "You're offline" : "Can't reach the server"}
							</p>
							<p className="truncate text-xs leading-5 opacity-80">
								{status === "offline"
									? "This page still works from what it's loaded. Saves resume automatically when you're back."
									: `${held} queued request${held === 1 ? "" : "s"} — retrying automatically.`}
							</p>
						</div>
						{status === "degraded" && (
							<Button size="xs" intent="warning" onPress={resume}>
								Retry now
							</Button>
						)}
					</div>
				</motion.output>
			)}
		</AnimatePresence>
	);
}

/** A steady dot when degraded, a slow ping when the browser reports offline. */
function StatusDot({ offline, reduceMotion }: { offline: boolean; reduceMotion: boolean | null }) {
	return (
		<span className="relative flex size-2.5 shrink-0 items-center justify-center" aria-hidden>
			{offline && (
				<motion.span
					initial={reduceMotion ? false : { opacity: 0.5, scale: 1 }}
					animate={
						reduceMotion ? undefined : { opacity: [0.5, 0, 0.5], scale: [1, 2.4, 1] }
					}
					transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
					className="absolute inline-flex size-full rounded-full bg-warning"
				/>
			)}
			<span className="relative inline-flex size-2 rounded-full bg-warning" />
		</span>
	);
}
