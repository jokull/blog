"use client";

import { useEffect, useId, useRef } from "react";

// "solberg.is" set in Helvetica Now Display Black, outlined.
const W = 531;
const H = 148;
const D =
	"M54 100.8C70.4 100.8 80 94.7 80 83.7C80 74.1 73.9 69 61.8 67.3L53 66.1C48.6 65.5 46.6 64.5 46.6 62C46.6 59.7 48.3 58.1 53.4 58.1C58.1 58.1 61.5 59.5 61.6 64.3H78.5C77.9 54.6 72.2 46.4 53.4 46.4C37.1 46.4 28.6 52.5 28.6 63.3C28.6 73 35.6 77.8 46.5 79.4L53.9 80.5C60.1 81.4 61.7 82.7 61.7 85.2C61.7 87.6 59.8 89.1 54.4 89.1C48.8 89.1 46.4 87.6 45.8 82.8H28C29 95.9 37.1 100.8 54 100.8ZM111.8 100.4C129 100.4 139.6 89.7 139.6 73.4C139.6 57.1 129 46.4 111.8 46.4C94.6 46.4 84 57.1 84 73.4C84 89.7 94.6 100.4 111.8 100.4ZM111.8 86C106 86 102.5 82.2 102.5 73.4C102.5 64.6 106 60.8 111.8 60.8C117.6 60.8 121.1 64.6 121.1 73.4C121.1 82.2 117.6 86 111.8 86ZM165 99.2V28H146.6V99.2ZM206.7 46.4C200.1 46.4 195.5 49 192.4 53.2V28H174V99.2H191.9V92.8C195 97.5 199.7 100.4 206.7 100.4C220.6 100.4 228.7 89.7 228.7 73.4C228.7 57.1 220.6 46.4 206.7 46.4ZM201.2 86C195.4 86 192.2 82.2 192.2 73.4C192.2 64.6 195.4 60.8 201.2 60.8C207 60.8 210.2 64.2 210.2 73C210.2 81.8 207 86 201.2 86ZM261.5 100.4C274 100.4 284.9 94.2 287.8 82.9H270.6C268.8 85.9 265.8 87.4 261.5 87.4C256.4 87.4 252.4 84.6 251.2 78.7H289V75.4C289 57.1 277.7 46.4 261.3 46.4C244.6 46.4 233.7 57.1 233.7 73.4C233.7 89.7 244.8 100.4 261.5 100.4ZM251.2 67.8C252.4 61.8 256.2 59.4 261.1 59.4C266.4 59.4 270.1 62.2 271.3 67.8ZM328.4 46.8C320.9 46.8 316.3 50.5 314.5 57.8V47.6H296.5V99.2H314.9V77.2C314.9 67.6 319.2 63.6 327.3 63.6H332.1V47.1C331 46.9 329.8 46.8 328.4 46.8ZM372.2 53.9C369.4 49.4 364.8 46.4 357.6 46.4C344.2 46.4 335.6 56.9 335.6 71.7C335.6 86.5 344.6 97.2 358 97.2C364.7 97.2 369 94.6 371.8 90.5V98.5C371.8 103.3 369.1 106.5 363.4 106.5C357.9 106.5 355.2 104.4 355 100.2H336.9C337.3 111.8 345.7 120 362.9 120C380.2 120 390.2 111.8 390.2 97.8V47.6H372.2ZM363.1 82.8C357.3 82.8 354.1 79.4 354.1 72.1C354.1 64.8 357.3 60.8 363.1 60.8C368.9 60.8 372.1 64.4 372.1 71.7C372.1 79 368.9 82.8 363.1 82.8ZM418.6 99.2V79.4H398.2V99.2ZM444.5 42.9V28.5H427.1V42.9ZM445 99.2V47.6H426.6V99.2ZM477 100.8C493.4 100.8 503 94.7 503 83.7C503 74.1 496.9 69 484.8 67.3L476 66.1C471.6 65.5 469.6 64.5 469.6 62C469.6 59.7 471.3 58.1 476.4 58.1C481.1 58.1 484.5 59.5 484.6 64.3H501.5C500.9 54.6 495.2 46.4 476.4 46.4C460.1 46.4 451.6 52.5 451.6 63.3C451.6 73 458.6 77.8 469.5 79.4L476.9 80.5C483.1 81.4 484.7 82.7 484.7 85.2C484.7 87.6 482.8 89.1 477.4 89.1C471.8 89.1 469.4 87.6 468.8 82.8H451C452 95.9 460.1 100.8 477 100.8Z";

// The group draws three channels that the filter pulls apart again:
//   R = glyph mask, G = melt ramp (raises the cut-off locally), B = steel stripe.
// Two sources feed G, combined with `lighten` (max): an idle wipe that sweeps the
// word left to right on a loop, and a radial melt that follows the pointer.
const PERIOD = W * 4;
const STRIPE = Math.round(W * 1.4);
const PEAK = 0.55;
const MELT_RADIUS = 115;
const green = (v: number) => `rgb(0,${Math.round(v * 255)},0)`;

// grey (0 = core, 1 = paper) → dark steel core, silver band where the haze begins, ice fringe
const RAMP_R = ".04 .1 .18 .31 .62 .89 .62 .76 .93";
const RAMP_G = ".08 .17 .3 .45 .71 .93 .74 .86 .96";
const RAMP_B = ".14 .28 .45 .63 .81 .96 .88 .95 .99";

export function PuddleLogo({ className }: { className?: string }) {
	const id = useId().replace(/[^\w-]/g, "");
	const svgRef = useRef<SVGSVGElement>(null);
	const meltRef = useRef<SVGRadialGradientElement>(null);

	useEffect(() => {
		const svg = svgRef.current;
		const melt = meltRef.current;
		if (!svg || !melt) return;
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			svg.pauseAnimations();
			svg.setCurrentTime(0);
			return;
		}

		const pos = { x: W / 2, y: H / 2 };
		const target = { x: W / 2, y: H / 2 };
		let radius = 0;
		let active = false;
		let frame = 0;

		const tick = () => {
			pos.x += (target.x - pos.x) * 0.12;
			pos.y += (target.y - pos.y) * 0.12;
			radius += ((active ? MELT_RADIUS : 0) - radius) * (active ? 0.08 : 0.04);
			melt.setAttribute("cx", pos.x.toFixed(1));
			melt.setAttribute("cy", pos.y.toFixed(1));
			melt.setAttribute("r", radius.toFixed(1));
			if (!active && radius < 0.5) {
				melt.setAttribute("r", "0");
				svg.unpauseAnimations();
				frame = 0;
				return;
			}
			frame = requestAnimationFrame(tick);
		};

		const onMove = (event: PointerEvent) => {
			const box = svg.getBoundingClientRect();
			const near =
				event.clientX > box.left - 40 &&
				event.clientX < box.right + 40 &&
				event.clientY > box.top - 40 &&
				event.clientY < box.bottom + 40;
			target.x = ((event.clientX - box.left) / box.width) * W;
			target.y = ((event.clientY - box.top) / box.height) * H;
			if (near && !active) {
				active = true;
				// Hold the idle wipe on fully formed letters while the pointer is in charge.
				svg.pauseAnimations();
				svg.setCurrentTime(0);
				if (radius === 0) {
					pos.x = target.x;
					pos.y = target.y;
				}
			} else if (!near) {
				active = false;
			}
			if (!frame) frame = requestAnimationFrame(tick);
		};

		window.addEventListener("pointermove", onMove, { passive: true });
		return () => {
			window.removeEventListener("pointermove", onMove);
			cancelAnimationFrame(frame);
		};
	}, []);

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${W} ${H}`}
			className={className}
			aria-hidden="true"
			style={{ colorInterpolationFilters: "sRGB" }}
		>
			<defs>
				<linearGradient
					id={`${id}wipe`}
					gradientUnits="userSpaceOnUse"
					x2={PERIOD}
					spreadMethod="repeat"
				>
					<stop offset=".2" stopColor={green(0)} />
					<stop offset=".31" stopColor={green(PEAK)} />
					<stop offset=".34" stopColor={green(PEAK)} />
					<stop offset=".52" stopColor={green(0)} />
					<animateTransform
						attributeName="gradientTransform"
						type="translate"
						from={`${-0.9 * PERIOD} 0`}
						to={`${0.1 * PERIOD} 0`}
						dur="14s"
						repeatCount="indefinite"
					/>
				</linearGradient>
				<radialGradient ref={meltRef} id={`${id}melt`} gradientUnits="userSpaceOnUse" r="0">
					<stop offset="0" stopColor={green(0.45)} />
					<stop offset=".4" stopColor={green(0.36)} />
					<stop offset="1" stopColor={green(0)} />
				</radialGradient>
				<linearGradient
					id={`${id}stripe`}
					gradientUnits="userSpaceOnUse"
					x2={STRIPE}
					spreadMethod="repeat"
				>
					<stop stopColor="rgb(255,0,80)" />
					<stop offset=".5" stopColor="rgb(255,0,0)" />
					<stop offset="1" stopColor="rgb(255,0,80)" />
					<animateTransform
						attributeName="gradientTransform"
						type="translate"
						from="0 0"
						to={`${STRIPE} 0`}
						dur="14s"
						repeatCount="indefinite"
					/>
				</linearGradient>
				<filter
					id={`${id}steel`}
					filterUnits="userSpaceOnUse"
					x="0"
					y="0"
					width={W}
					height={H}
				>
					<feColorMatrix
						in="SourceGraphic"
						type="matrix"
						values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"
					/>
					<feGaussianBlur stdDeviation="7" result="field" />
					<feColorMatrix
						in="SourceGraphic"
						type="matrix"
						values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 1 0 0 0"
						result="ramp"
					/>
					<feComposite in="field" in2="ramp" operator="arithmetic" k2="1" k3="-1" />
					<feComponentTransfer result="shape">
						<feFuncA type="linear" slope="8" intercept="-3.04" />
					</feComponentTransfer>
					<feColorMatrix
						in="SourceGraphic"
						type="matrix"
						values="0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  1 0 0 0 0"
					/>
					<feComposite in2="shape" operator="in" />
					<feGaussianBlur stdDeviation="3.5" result="blur" />
					<feFlood floodColor="#fff" />
					<feMerge result="soft">
						<feMergeNode />
						<feMergeNode in="blur" />
					</feMerge>
					<feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} seed={7} />
					<feColorMatrix
						type="matrix"
						values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1"
						result="grain"
					/>
					<feComposite
						in="soft"
						in2="grain"
						operator="arithmetic"
						k2="1"
						k3=".05"
						k4="-.025"
					/>
					<feColorMatrix
						type="matrix"
						values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  -9 0 0 0 8.6"
					/>
					<feComponentTransfer>
						<feFuncR type="table" tableValues={RAMP_R} />
						<feFuncG type="table" tableValues={RAMP_G} />
						<feFuncB type="table" tableValues={RAMP_B} />
						<feFuncA type="table" tableValues="0 .55 .9 1" />
					</feComponentTransfer>
				</filter>
			</defs>
			<g filter={`url(#${id}steel)`}>
				<rect width={W} height={H} fill={`url(#${id}wipe)`} />
				<rect
					width={W}
					height={H}
					fill={`url(#${id}melt)`}
					style={{ mixBlendMode: "lighten" }}
				/>
				<path d={D} fill={`url(#${id}stripe)`} style={{ mixBlendMode: "screen" }} />
			</g>
		</svg>
	);
}
