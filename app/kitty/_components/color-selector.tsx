"use client";

import { oklchToCss } from "../_lib/color-utils";
import type { ColorKey, KittyTheme } from "../_lib/types";
import { colorLabels } from "../_lib/types";

interface ColorSelectorProps {
	theme: KittyTheme;
	selectedColor: ColorKey;
	onSelectColor: (key: ColorKey) => void;
}

interface ColorItemProps {
	colorKey: ColorKey;
	color: { l: number; c: number; h: number };
	isSelected: boolean;
	onSelect: () => void;
}

function ColorItem({ colorKey, color, isSelected, onSelect }: ColorItemProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-label={`Select ${colorLabels[colorKey]}`}
			className={`flex items-center gap-2 p-2 rounded-md border transition-all text-left w-full ${
				isSelected
					? "bg-blue-500/10 border-blue-500"
					: "bg-transparent border-transparent hover:bg-muted/10 hover:border-border"
			}`}
		>
			<span
				className="w-6 h-6 rounded [box-shadow:inset_0_0_0_1px_rgba(0,0,0,0.2)] shrink-0"
				style={{ backgroundColor: oklchToCss(color) }}
			/>
			<div className="flex flex-col gap-px flex-1 min-w-0 leading-none">
				<span className="text-xs truncate">{colorLabels[colorKey]}</span>
				<span className="font-mono text-[10px] text-muted-fg">{colorKey}</span>
			</div>
		</button>
	);
}

interface ColorGroupProps {
	colors: ColorKey[];
	theme: KittyTheme;
	selectedColor: ColorKey;
	onSelectColor: (key: ColorKey) => void;
}

function ColorGroup({ colors, theme, selectedColor, onSelectColor }: ColorGroupProps) {
	return (
		<div>
			<div className="flex flex-col gap-1">
				{colors.map((key) => (
					<ColorItem
						key={key}
						colorKey={key}
						color={theme.colors[key]}
						isSelected={selectedColor === key}
						onSelect={() => {
							onSelectColor(key);
						}}
					/>
				))}
			</div>
		</div>
	);
}

const normalColors: ColorKey[] = [
	"color0",
	"color1",
	"color2",
	"color3",
	"color4",
	"color5",
	"color6",
	"color7",
];
const brightColors: ColorKey[] = [
	"color8",
	"color9",
	"color10",
	"color11",
	"color12",
	"color13",
	"color14",
	"color15",
];
const basicColors: ColorKey[] = [
	"foreground",
	"background",
	"cursor",
	"selection_foreground",
	"selection_background",
];

// Returns three separate column elements for use in a parent grid
export function ColorSelector({ theme, selectedColor, onSelectColor }: ColorSelectorProps) {
	return (
		<>
			<ColorGroup
				colors={normalColors}
				theme={theme}
				selectedColor={selectedColor}
				onSelectColor={onSelectColor}
			/>
			<ColorGroup
				colors={brightColors}
				theme={theme}
				selectedColor={selectedColor}
				onSelectColor={onSelectColor}
			/>
			<ColorGroup
				colors={basicColors}
				theme={theme}
				selectedColor={selectedColor}
				onSelectColor={onSelectColor}
			/>
		</>
	);
}
