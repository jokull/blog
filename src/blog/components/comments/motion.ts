/**
 * The comment thread's motion vocabulary, in one place.
 *
 * Two rules shape everything here. This is a personal blog, not a trading
 * terminal, so a little overshoot is fine — but comments are *text*, and text
 * that bounces is hard to read, so the bounce is small and short. And every
 * variant animates `opacity` and `transform` only: both are compositor
 * properties, so a thread of thirty comments reflowing does not repaint.
 *
 * `visualDuration` is the perceptual one — how long the motion looks like it
 * takes — rather than the tail of the spring, which is what `duration` would
 * measure.
 */
import type { Transition, Variants } from "motion/react";

/** For anything that moves: rows entering, the composer settling. */
export const springy: Transition = {
	type: "spring",
	bounce: 0.18,
	visualDuration: 0.32,
};

/** For anything that only fades. Springs on opacity read as sloppy. */
export const fade: Transition = { duration: 0.18, ease: "easeOut" };

/**
 * A comment row. Exit collapses the height so the rows below close the gap
 * rather than jumping — `layout` on the row handles the rest.
 */
export const commentRow: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0, transition: springy },
	/**
	 * An optimistic row, dimmed rather than replaced by a skeleton: the reader's
	 * own words are the best possible placeholder.
	 *
	 * Declared as a variant, not a `style={{ opacity }}` prop: Motion treats a
	 * value passed through `style` as externally owned and never animates it,
	 * which strands the row at `initial`'s `opacity: 0` while `y` animates
	 * normally. Anything Motion animates has to be declared here.
	 */
	pending: { opacity: 0.55, y: 0, transition: springy },
	exit: { opacity: 0, y: -4, transition: fade },
};

/** The transient "Posted" confirmation. Small, fast, and gone. */
export const confirmation: Variants = {
	initial: { opacity: 0, scale: 0.9 },
	animate: { opacity: 1, scale: 1, transition: { ...springy, visualDuration: 0.2 } },
	exit: { opacity: 0, scale: 0.95, transition: fade },
};

/** How long a success confirmation stays on screen. */
export const CONFIRMATION_MS = 1800;
