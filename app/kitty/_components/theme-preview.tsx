"use client";

import { oklchToCss } from "../_lib/color-utils";
import type { KittyTheme } from "../_lib/types";

interface ThemePreviewProps {
	theme: KittyTheme;
}

export function ThemePreview({ theme }: ThemePreviewProps) {
	return (
		<div className="w-full">
			<div
				className="rounded-lg overflow-hidden border border-border shadow-lg"
				style={{
					backgroundColor: oklchToCss(theme.colors.background),
					color: oklchToCss(theme.colors.foreground),
				}}
			>
				<div className="px-4 py-3 bg-black/20 border-b border-white/5 flex items-center gap-2">
					<span className="font-mono text-xs opacity-70">kitty @ /dev/tty</span>
				</div>

				<div className="p-6 font-mono text-sm leading-relaxed">
					<div className="mb-6">
						<div className="font-semibold mb-3 opacity-70 text-xs">Sample Output:</div>
						<div className="mb-2">
							<span style={{ color: oklchToCss(theme.colors.color1) }}>error</span>
							{": "}
							<span style={{ color: oklchToCss(theme.colors.color3) }}>warning</span>
							{" - "}
							<span style={{ color: oklchToCss(theme.colors.color2) }}>success</span>
							{" | "}
							<span style={{ color: oklchToCss(theme.colors.color4) }}>info</span>
						</div>
						<div className="mb-2">
							The quick{" "}
							<span style={{ color: oklchToCss(theme.colors.color5) }}>brown</span>{" "}
							fox{" "}
							<span style={{ color: oklchToCss(theme.colors.color6) }}>jumps</span>{" "}
							over the lazy dog
						</div>
						<div
							className="inline-block px-2 py-1 my-2 rounded-sm"
							style={{
								backgroundColor: oklchToCss(theme.colors.selection_background),
								color: oklchToCss(theme.colors.selection_foreground),
							}}
						>
							This text is selected
						</div>
						<div className="mt-3 flex items-center gap-1">
							Type here
							<span
								className="inline-block w-2 h-4 animate-[blink_1s_step-end_infinite]"
								style={{ backgroundColor: oklchToCss(theme.colors.cursor) }}
							/>
						</div>
					</div>
				</div>
			</div>

			<style>{`
				@keyframes blink {
					0%,
					50% {
						opacity: 1;
					}
					51%,
					100% {
						opacity: 0;
					}
				}
			`}</style>
		</div>
	);
}
