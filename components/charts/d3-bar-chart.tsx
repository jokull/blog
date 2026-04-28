"use client";

import * as d3Array from "d3-array";
import * as d3Scale from "d3-scale";
import { BLUE, GRID_COLOR, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

interface DataPoint {
	label: string | number;
	value: number;
	highlight?: boolean;
}

interface D3BarChartProps {
	data: DataPoint[];
	title?: string;
	height?: number;
	yLabel?: string;
	yFormat?: string;
	color?: string;
	highlightColor?: string;
	horizontal?: boolean;
}

function formatTick(value: number, format?: string) {
	if (format === "percent") return `${Math.round(value)}%`;
	if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
	return String(Math.round(value));
}

export function D3BarChart({
	data,
	title,
	height = 260,
	yLabel,
	yFormat,
	color = BLUE[700],
	highlightColor = BLUE[900],
	horizontal = false,
}: D3BarChartProps) {
	const margin = horizontal
		? { top: 8, right: 40, bottom: 16, left: 80 }
		: { top: 16, right: 16, bottom: 32, left: yLabel ? 56 : 48 };

	const { ref, innerWidth, innerHeight } = useChartDimensions(margin);

	if (innerWidth === 0) {
		return (
			<div className="my-10 w-full max-w-xl">
				{title && (
					<p className="mb-3 text-center text-sm font-semibold text-neutral-900">
						{title}
					</p>
				)}
				<div ref={ref} style={{ height }} />
			</div>
		);
	}

	if (horizontal) {
		const yScale = d3Scale
			.scaleBand()
			.domain(data.map((d) => String(d.label)))
			.range([0, innerHeight])
			.padding(0.3);

		const xMax = d3Array.max(data, (d) => Math.abs(d.value)) ?? 0;
		const hasNegative = data.some((d) => d.value < 0);
		const xScale = d3Scale
			.scaleLinear()
			.domain(hasNegative ? [-xMax, xMax] : [0, xMax * 1.1])
			.range([0, innerWidth]);

		return (
			<div className="my-10 w-full max-w-xl">
				{title && (
					<p className="mb-3 text-center text-sm font-semibold text-neutral-900">
						{title}
					</p>
				)}
				<div ref={ref} style={{ height }}>
					<svg
						width={innerWidth + margin.left + margin.right}
						height={innerHeight + margin.top + margin.bottom}
						className="overflow-visible"
					>
						<g transform={`translate(${margin.left},${margin.top})`}>
							{/* Zero line for negative values */}
							{hasNegative && (
								<line
									x1={xScale(0)}
									x2={xScale(0)}
									y1={0}
									y2={innerHeight}
									stroke={GRID_COLOR}
									strokeWidth={1}
								/>
							)}

							{data.map((d) => {
								const barColor = d.highlight ? highlightColor : color;
								const barWidth =
									d.value >= 0
										? xScale(d.value) - xScale(0)
										: xScale(0) - xScale(d.value);
								const barX = d.value >= 0 ? xScale(0) : xScale(d.value);

								return (
									<g key={String(d.label)}>
										<rect
											x={hasNegative ? barX : 0}
											y={yScale(String(d.label))}
											width={hasNegative ? barWidth : xScale(d.value)}
											height={yScale.bandwidth()}
											fill={barColor}
											rx={3}
										/>
										<text
											x={-8}
											y={yScale(String(d.label))! + yScale.bandwidth() / 2}
											textAnchor="end"
											dominantBaseline="middle"
											fill={TEXT_COLOR}
											fontSize={12}
											fontFamily="var(--font-sans)"
										>
											{d.label}
										</text>
										{/* Value label */}
										<text
											x={
												hasNegative
													? d.value >= 0
														? barX + barWidth + 4
														: barX - 4
													: xScale(d.value) + 4
											}
											y={yScale(String(d.label))! + yScale.bandwidth() / 2}
											textAnchor={
												hasNegative && d.value < 0 ? "end" : "start"
											}
											dominantBaseline="middle"
											fill={TEXT_COLOR}
											fontSize={12}
											fontFamily="var(--font-sans)"
											fontWeight={d.highlight ? 600 : 400}
										>
											{formatTick(d.value, yFormat)}
										</text>
									</g>
								);
							})}
						</g>
					</svg>
				</div>
			</div>
		);
	}

	// Vertical bar chart
	const xScale = d3Scale
		.scaleBand()
		.domain(data.map((d) => String(d.label)))
		.range([0, innerWidth])
		.padding(0.25);

	const yMax = d3Array.max(data, (d) => d.value) ?? 0;
	const yScale = d3Scale
		.scaleLinear()
		.domain([0, yMax * 1.1])
		.range([innerHeight, 0])
		.nice();

	const yTicks = yScale.ticks(5);

	return (
		<div className="my-10 w-full max-w-xl">
			{title && (
				<p className="mb-3 text-center text-sm font-semibold text-neutral-900">{title}</p>
			)}
			<div ref={ref} style={{ height }}>
				<svg
					width={innerWidth + margin.left + margin.right}
					height={innerHeight + margin.top + margin.bottom}
					className="overflow-visible"
				>
					<g transform={`translate(${margin.left},${margin.top})`}>
						{/* Grid lines */}
						{yTicks.map((tick) => (
							<line
								key={tick}
								x1={0}
								x2={innerWidth}
								y1={yScale(tick)}
								y2={yScale(tick)}
								stroke={GRID_COLOR}
								strokeWidth={1}
							/>
						))}

						{/* Y axis labels */}
						{yTicks.map((tick) => (
							<text
								key={tick}
								x={-8}
								y={yScale(tick)}
								textAnchor="end"
								dominantBaseline="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{formatTick(tick, yFormat)}
							</text>
						))}

						{yLabel && (
							<text
								x={-margin.left + 8}
								y={-4}
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{yLabel}
							</text>
						)}

						{/* Bars */}
						{data.map((d) => {
							const barColor = d.highlight ? highlightColor : color;
							return (
								<g key={String(d.label)}>
									<rect
										x={xScale(String(d.label))}
										y={yScale(d.value)}
										width={xScale.bandwidth()}
										height={innerHeight - yScale(d.value)}
										fill={barColor}
										rx={3}
									/>
									<text
										x={xScale(String(d.label))! + xScale.bandwidth() / 2}
										y={innerHeight + 16}
										textAnchor="middle"
										fill={TEXT_COLOR}
										fontSize={12}
										fontFamily="var(--font-sans)"
									>
										{d.label}
									</text>
								</g>
							);
						})}
					</g>
				</svg>
			</div>
		</div>
	);
}
