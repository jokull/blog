"use client";

import { oklchToCss } from "../lib/color-utils";
import type { OklchColor } from "../lib/types";
import { OklchPicker } from "./oklch/oklch-picker";

interface ColorEditorProps {
	color: OklchColor;
	onColorChange: (color: OklchColor) => void;
	disabled?: boolean;
}

export function ColorEditor({ color, onColorChange, disabled }: ColorEditorProps) {
	const cssColor = oklchToCss(color);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 p-3 bg-muted/5 rounded-lg border border-border">
				<div
					className="w-full h-20 rounded-sm inset-shadow-sm"
					style={{ backgroundColor: cssColor }}
				/>
			</div>
			<OklchPicker color={color} onChange={onColorChange} disabled={disabled} />
		</div>
	);
}
