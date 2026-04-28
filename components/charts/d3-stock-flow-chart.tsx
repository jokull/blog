"use client";

import * as d3Array from "d3-array";
import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import { BLUE, GRID_COLOR, RED, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

interface StockFlowDatum {
	year: number | string;
	institutionalRental: number;
	stuckInventory: number;
	newCompletions: number;
}

interface D3StockFlowChartProps {
	data: StockFlowDatum[];
	title?: string;
	height?: number;
	dwellingStockLabel?: string;
	institutionalLabel?: string;
	stuckLabel?: string;
	flowLabel?: string;
}

function formatThousands(value: number) {
	if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return String(Math.round(value));
}

// Zigzag path for broken-axis indicator
function zigzagPath(x0: number, x1: number, y: number, amplitude = 4, step = 10) {
	let d = `M ${x0} ${y}`;
	let flip = true;
	for (let x = x0 + step; x < x1; x += step) {
		d += ` L ${x} ${y + (flip ? -amplitude : amplitude)}`;
		flip = !flip;
	}
	d += ` L ${x1} ${y}`;
	return d;
}

export function D3StockFlowChart({
	data,
	title,
	height = 460,
	dwellingStockLabel = "Pre-existing dwelling stock (~170k)",
	institutionalLabel = "Institutional rental stock",
	stuckLabel = "Unsold new-build inventory (on developer books)",
	flowLabel = "New completions flowing in",
}: D3StockFlowChartProps) {
	const margin = { top: 48, right: 16, bottom: 72, left: 64 };
	const { ref, innerWidth, innerHeight } = useChartDimensions(margin);

	if (innerWidth === 0) {
		return (
			<div className="my-10 w-full max-w-3xl">
				{title && (
					<p className="mb-3 text-center text-sm font-semibold text-neutral-900">
						{title}
					</p>
				)}
				<div ref={ref} style={{ height }} />
			</div>
		);
	}

	// Layout: top section (stacked bands), break zone, bottom section (reference bar)
	const BOTTOM_H = Math.round(innerHeight * 0.15);
	const BREAK_H = 22;
	const TOP_H = innerHeight - BOTTOM_H - BREAK_H;

	const topTop = 0;
	const topBot = TOP_H;
	const breakTop = topBot;
	const breakBot = breakTop + BREAK_H;
	const bottomTop = breakBot;
	const bottomBot = innerHeight;

	// X scale (band-like, but we'll also use points at bar centers for flow lines)
	const xScale = d3Scale
		.scaleBand()
		.domain(data.map((d) => String(d.year)))
		.range([0, innerWidth])
		.padding(0.08);

	// Top section y scale: 0 to max(institutional + stuck) + headroom for flow arrows
	const topMaxStack = d3Array.max(data, (d) => d.institutionalRental + d.stuckInventory) ?? 0;
	// Add 30% headroom so flow arrows have space to drop from above
	const topYMax = topMaxStack * 1.35;

	const topYScale = d3Scale.scaleLinear().domain([0, topYMax]).range([topBot, topTop]).nice();

	const topTicks = topYScale.ticks(5);

	const barWidth = xScale.bandwidth();

	// Build stacked areas in top section
	// Band 1 (bottom of stack): institutionalRental
	// Band 2 (on top): stuckInventory
	const instArea = d3Shape
		.area<StockFlowDatum>()
		.x((d) => (xScale(String(d.year)) ?? 0) + barWidth / 2)
		.y0(() => topYScale(0))
		.y1((d) => topYScale(d.institutionalRental))
		.curve(d3Shape.curveMonotoneX);

	const stuckArea = d3Shape
		.area<StockFlowDatum>()
		.x((d) => (xScale(String(d.year)) ?? 0) + barWidth / 2)
		.y0((d) => topYScale(d.institutionalRental))
		.y1((d) => topYScale(d.institutionalRental + d.stuckInventory))
		.curve(d3Shape.curveMonotoneX);

	// Colors
	const INST_COLOR = BLUE[500];
	const STUCK_COLOR = RED;
	const DWELLING_COLOR = BLUE[100];

	return (
		<div className="my-10 w-full max-w-3xl">
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
						{/* Top section grid + y ticks */}
						{topTicks.map((tick) => (
							<g key={`tt-${tick}`}>
								<line
									x1={0}
									x2={innerWidth}
									y1={topYScale(tick)}
									y2={topYScale(tick)}
									stroke={GRID_COLOR}
									strokeWidth={1}
									strokeDasharray="2 3"
								/>
								<text
									x={-8}
									y={topYScale(tick)}
									textAnchor="end"
									dominantBaseline="middle"
									fill={TEXT_COLOR}
									fontSize={11}
									fontFamily="var(--font-sans)"
								>
									{formatThousands(tick)}
								</text>
							</g>
						))}

						{/* Institutional rental (bottom of stack) */}
						<path d={instArea(data) ?? ""} fill={INST_COLOR} opacity={0.85} />

						{/* Stuck inventory (widening on top) */}
						<path d={stuckArea(data) ?? ""} fill={STUCK_COLOR} opacity={0.9} />

						{/* Flow arrows: one per year, entering from top of chart, landing on top of stack */}
						{data.map((d) => {
							const cx = (xScale(String(d.year)) ?? 0) + barWidth / 2;
							const arrowTopY = topTop - 28;
							const arrowBotY =
								topYScale(d.institutionalRental + d.stuckInventory) - 4;
							return (
								<g key={`flow-${d.year}`}>
									<line
										x1={cx}
										x2={cx}
										y1={arrowTopY}
										y2={arrowBotY - 6}
										stroke={TEXT_COLOR}
										strokeWidth={1.4}
										strokeDasharray="3 3"
									/>
									<path
										d={`M ${cx - 4} ${arrowBotY - 6} L ${cx} ${arrowBotY} L ${cx + 4} ${arrowBotY - 6} Z`}
										fill={TEXT_COLOR}
									/>
									<text
										x={cx}
										y={arrowTopY - 4}
										textAnchor="middle"
										fill={TEXT_COLOR}
										fontSize={10}
										fontFamily="var(--font-sans)"
									>
										{`+${formatThousands(d.newCompletions)}`}
									</text>
								</g>
							);
						})}

						{/* Flow label at top left */}
						<text
							x={0}
							y={topTop - 32}
							fill={TEXT_COLOR}
							fontSize={11}
							fontStyle="italic"
							fontFamily="var(--font-sans)"
						>
							{flowLabel}
						</text>

						{/* Break zone (zigzag) */}
						<rect
							x={-4}
							y={breakTop}
							width={innerWidth + 8}
							height={BREAK_H}
							fill="white"
						/>
						<path
							d={zigzagPath(0, innerWidth, breakTop + BREAK_H / 2 - 2)}
							fill="none"
							stroke={TEXT_COLOR}
							strokeWidth={1}
						/>
						<path
							d={zigzagPath(0, innerWidth, breakTop + BREAK_H / 2 + 4)}
							fill="none"
							stroke={TEXT_COLOR}
							strokeWidth={1}
						/>

						{/* Bottom section: dwelling stock reference bar */}
						<rect
							x={0}
							y={bottomTop}
							width={innerWidth}
							height={bottomBot - bottomTop}
							fill={DWELLING_COLOR}
							opacity={0.9}
						/>

						{/* "~170k" label on left side of bottom */}
						<text
							x={-8}
							y={bottomTop + (bottomBot - bottomTop) / 2}
							textAnchor="end"
							dominantBaseline="middle"
							fill={TEXT_COLOR}
							fontSize={11}
							fontFamily="var(--font-sans)"
						>
							~170k
						</text>
						<text
							x={innerWidth / 2}
							y={bottomTop + (bottomBot - bottomTop) / 2}
							textAnchor="middle"
							dominantBaseline="middle"
							fill={TEXT_COLOR}
							fontSize={12}
							fontFamily="var(--font-sans)"
							fontStyle="italic"
						>
							{dwellingStockLabel}
						</text>

						{/* X axis labels */}
						{data.map((d) => (
							<text
								key={`xl-${d.year}`}
								x={(xScale(String(d.year)) ?? 0) + barWidth / 2}
								y={bottomBot + 16}
								textAnchor="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{d.year}
							</text>
						))}

						{/* Legend */}
						<g transform={`translate(0, ${bottomBot + 40})`}>
							{[
								{ color: STUCK_COLOR, label: stuckLabel, x: 0 },
								{ color: INST_COLOR, label: institutionalLabel, x: 320 },
							].map((item) => (
								<g key={item.label} transform={`translate(${item.x}, 0)`}>
									<rect
										x={0}
										y={-6}
										width={12}
										height={12}
										fill={item.color}
										rx={2}
										opacity={0.9}
									/>
									<text
										x={18}
										y={0}
										dominantBaseline="middle"
										fill={TEXT_COLOR}
										fontSize={11}
										fontFamily="var(--font-sans)"
									>
										{item.label}
									</text>
								</g>
							))}
						</g>
					</g>
				</svg>
			</div>
		</div>
	);
}
