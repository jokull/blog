"use client";

import { formatCss, modeOklch, useMode } from "culori/fn";
import { useEffect, useRef, useState } from "react";
import type { OklchColor } from "../../lib/types";

// Note: `useMode` is a culori utility function, NOT a React hook
// It registers a color mode and returns a converter function
// eslint-disable-next-line react-hooks/rules-of-hooks
const oklch = useMode(modeOklch);

interface OklchSliderProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	color: OklchColor;
	onChange: (value: number) => void;
	channel: "l" | "c" | "h";
	disabled?: boolean;
}

// Format value for display based on channel
function formatValue(value: number, channel: "l" | "c" | "h"): string {
	if (channel === "l") {
		return (value * 100).toFixed(0);
	} else if (channel === "h") {
		return value.toFixed(0);
	} else {
		return value.toFixed(3);
	}
}

// Parse input string to internal value, returns null if invalid
function parseInput(
	input: string,
	channel: "l" | "c" | "h",
	min: number,
	max: number,
): number | null {
	// Strip common suffixes
	const cleaned = input.replace(/[%°]/g, "").trim();

	if (cleaned === "" || cleaned === "-" || cleaned === ".") {
		return null;
	}

	const parsed = parseFloat(cleaned);

	if (isNaN(parsed)) {
		return null;
	}

	// Convert from display value to internal value
	let internalValue: number;
	if (channel === "l") {
		// L is displayed as 0-100%, stored as 0-1
		internalValue = parsed / 100;
	} else {
		internalValue = parsed;
	}

	// Check bounds
	if (internalValue < min || internalValue > max) {
		return null;
	}

	return internalValue;
}

// Get suffix for channel
function getSuffix(channel: "l" | "c" | "h"): string {
	if (channel === "l") return "%";
	if (channel === "h") return "°";
	return "";
}

export function OklchSlider({
	label,
	value,
	min,
	max,
	step,
	color,
	onChange,
	channel,
	disabled = false,
}: OklchSliderProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Track the raw input value and validity
	const [inputValue, setInputValue] = useState(() => formatValue(value, channel));
	const [isEditing, setIsEditing] = useState(false);
	const [isValid, setIsValid] = useState(true);

	// Update input value when external value changes (and not editing)
	useEffect(() => {
		if (!isEditing) {
			setInputValue(formatValue(value, channel));
			setIsValid(true);
		}
	}, [value, channel, isEditing]);

	// Draw gradient background
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d", { willReadFrequently: false });
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;

		// Create gradient based on channel
		for (let x = 0; x < width; x++) {
			const t = x / (width - 1);
			const gradientValue = min + t * (max - min);

			// Build color with current channel modified
			const gradientColor = {
				...color,
				[channel]: gradientValue,
				mode: "oklch" as const,
			};

			// Convert to CSS and draw
			const cssColor = formatCss(oklch(gradientColor));
			ctx.fillStyle = cssColor;
			ctx.fillRect(x, 0, 1, height);
		}
	}, [color, channel, min, max]);

	// Handle input change - allow any input, validate for visual feedback
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		setInputValue(raw);

		const parsed = parseInput(raw, channel, min, max);
		setIsValid(parsed !== null);

		// If valid, update the actual value immediately
		if (parsed !== null) {
			onChange(parsed);
		}
	};

	// Handle focus - select all for easy replacement
	const handleFocus = () => {
		setIsEditing(true);
		// Select all on next tick so the selection works
		setTimeout(() => {
			inputRef.current?.select();
		}, 0);
	};

	// Handle blur - revert to last valid value if invalid
	const handleBlur = () => {
		setIsEditing(false);

		const parsed = parseInput(inputValue, channel, min, max);
		if (parsed === null) {
			// Revert to the current valid value
			setInputValue(formatValue(value, channel));
			setIsValid(true);
		} else {
			// Format the value nicely
			setInputValue(formatValue(parsed, channel));
			setIsValid(true);
		}
	};

	// Handle keyboard - Enter commits, Escape reverts
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.currentTarget.blur();
		} else if (e.key === "Escape") {
			setInputValue(formatValue(value, channel));
			setIsValid(true);
			e.currentTarget.blur();
		}
	};

	// Calculate marker position as percentage
	const markerPosition = ((value - min) / (max - min)) * 100;

	const suffix = getSuffix(channel);

	return (
		<div>
			<div className="flex items-center justify-between mb-1">
				<label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
					{label}
				</label>
				<div
					className={`flex items-center justify-end grow font-mono text-sm rounded transition-colors ${
						isValid ? "bg-muted/10" : "bg-danger/10 ring-1 ring-danger"
					}`}
				>
					<input
						ref={inputRef}
						type="text"
						inputMode="decimal"
						value={inputValue}
						onChange={handleInputChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						className={`text-right bg-transparent px-1 py-1 outline-none ${
							disabled ? "opacity-50 cursor-not-allowed" : ""
						}`}
					/>
					{suffix && <span className="pr-2 text-muted-fg">{suffix}</span>}
				</div>
			</div>
			<div className={`relative h-6 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
				<canvas
					ref={canvasRef}
					width={300}
					height={32}
					className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg shadow-black/30 pointer-events-none"
				/>
				<div
					className="absolute top-1/2 w-4 h-4 bg-white rounded-full border-black/60 border-[0.5px] pointer-events-none shadow-lg z-10"
					style={{ left: `${markerPosition}%`, transform: "translate(-50%, -50%)" }}
				/>
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(e) => {
						onChange(parseFloat(e.target.value));
					}}
					disabled={disabled}
					className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing disabled:cursor-not-allowed"
				/>
			</div>
		</div>
	);
}
