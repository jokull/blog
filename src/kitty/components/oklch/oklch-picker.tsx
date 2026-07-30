"use client";

import { Input } from "@/components/ui/input";
import { oklch } from "culori";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OklchColor } from "../../lib/types";
import { OklchSlider } from "./oklch-slider";

interface OklchPickerProps {
	color: OklchColor;
	onChange: (color: OklchColor) => void;
	disabled?: boolean;
}

// Format as valid CSS oklch() value
function formatOklch(color: OklchColor): string {
	return `oklch(${(color.l * 100).toFixed(1)}% ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}

// Parse color string (hex or oklch) and return OklchColor or null
function parseColorInput(input: string): OklchColor | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	try {
		// culori's oklch() can parse hex, rgb, hsl, oklch, and many other formats
		const parsed = oklch(trimmed);
		if (!parsed) return null;

		const l = typeof parsed.l === "number" && !isNaN(parsed.l) ? parsed.l : null;
		const c = typeof parsed.c === "number" && !isNaN(parsed.c) ? parsed.c : null;
		const h = typeof parsed.h === "number" && !isNaN(parsed.h) ? parsed.h : 0;

		if (l === null || c === null) return null;

		return { l, c, h };
	} catch {
		return null;
	}
}

export function OklchPicker({ color, onChange, disabled }: OklchPickerProps) {
	// Track whether the input is currently focused
	const [isFocused, setIsFocused] = useState(false);
	// The current text in the input field
	const [inputValue, setInputValue] = useState(() => formatOklch(color));
	// Whether the current input is valid
	const [isValid, setIsValid] = useState(true);
	// Debounce timer ref
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Update input value when color changes from outside (sliders), but only if not focused
	useEffect(() => {
		if (!isFocused) {
			setInputValue(formatOklch(color));
			setIsValid(true);
		}
	}, [color, isFocused]);

	// Debounced color parsing and update
	const processInput = useCallback(
		(value: string) => {
			const parsed = parseColorInput(value);
			if (parsed) {
				setIsValid(true);
				onChange(parsed);
			} else {
				setIsValid(false);
			}
		},
		[onChange],
	);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);

		// Clear existing debounce timer
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Debounce the parsing
		debounceRef.current = setTimeout(() => {
			processInput(value);
		}, 300);
	};

	const handleFocus = () => {
		setIsFocused(true);
	};

	const handleBlur = () => {
		setIsFocused(false);

		// Clear any pending debounce
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
			debounceRef.current = null;
		}

		// If input is invalid, reset to last valid color
		if (!isValid) {
			setInputValue(formatOklch(color));
			setIsValid(true);
		}
	};

	// Cleanup debounce on unmount
	useEffect(
		() => () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		},
		[],
	);

	const handleLChange = (l: number) => {
		if (!disabled) onChange({ ...color, l });
	};

	const handleCChange = (c: number) => {
		if (!disabled) onChange({ ...color, c });
	};

	const handleHChange = (h: number) => {
		if (!disabled) onChange({ ...color, h });
	};

	return (
		<div
			className={`bg-muted/5 flex flex-col gap-4 rounded-lg ${disabled ? "opacity-50 pointer-events-none" : ""}`}
		>
			<OklchSlider
				label="Lightness"
				value={color.l}
				min={0}
				max={1}
				step={0.01}
				color={color}
				onChange={handleLChange}
				channel="l"
				disabled={disabled}
			/>
			<OklchSlider
				label="Chroma"
				value={color.c}
				min={0}
				max={0.37}
				step={0.001}
				color={color}
				onChange={handleCChange}
				channel="c"
				disabled={disabled}
			/>
			<OklchSlider
				label="Hue"
				value={color.h}
				min={0}
				max={360}
				step={1}
				color={color}
				onChange={handleHChange}
				channel="h"
				disabled={disabled}
			/>

			{/* Bidirectional color input - supports hex, oklch, rgb, hsl, etc. */}
			<div className="mt-3">
				<Input
					value={inputValue}
					onChange={handleInputChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					disabled={disabled}
					className={`font-mono ${!isValid ? "border-danger" : ""}`}
					placeholder="oklch(...) or #hex"
					spellCheck={false}
					autoComplete="off"
				/>
				{!isValid && (
					<p className="mt-1 text-[10px] text-red-400">
						Invalid color format. Try #hex, rgb(...), or oklch(...)
					</p>
				)}
			</div>
		</div>
	);
}
