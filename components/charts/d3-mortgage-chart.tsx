"use client";

import * as d3Array from "d3-array";
import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import { BLUE, GRID_COLOR, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

interface DataPoint {
	q: number; // quarter index (0 = Q1 2020)
	indexed: number;
	unindexed: number;
	rate: number;
}

interface Annotation {
	q: number;
	label: string;
}

interface D3MortgageChartProps {
	data: DataPoint[];
	title?: string;
	height?: number;
	annotations?: Annotation[];
}

const INDEXED_COLOR = BLUE[700];
const UNINDEXED_COLOR = BLUE[200];
const RATE_COLOR = "oklch(0.577 0.245 27.325)"; // danger/red from theme

const Q_LABELS: Record<number, string> = {
	0: "2020",
	4: "2021",
	8: "2022",
	12: "2023",
	16: "2024",
	20: "2025",
	24: "2026",
};

export function D3MortgageChart({ data, title, height = 320, annotations }: D3MortgageChartProps) {
	const margin = { top: 16, right: 48, bottom: 48, left: 56 };
	const { ref, innerWidth, innerHeight } = useChartDimensions(margin);

	if (innerWidth === 0) {
		return (
			<div className="my-10 w-full max-w-xl">
				{title && (
					<p className="mb-3 text-center text-sm font-medium text-neutral-500">{title}</p>
				)}
				<div ref={ref} style={{ height }} />
			</div>
		);
	}

	const xScale = d3Scale
		.scaleLinear()
		.domain([0, data.length - 1])
		.range([0, innerWidth]);

	// Y scale for credit flows (billions ISK)
	const allVals = data.flatMap((d) => [
		d.indexed,
		d.unindexed,
		d.indexed + Math.max(0, d.unindexed),
	]);
	const yMin = d3Array.min(allVals) ?? -50;
	const yMax = d3Array.max(allVals) ?? 150;
	const yScale = d3Scale
		.scaleLinear()
		.domain([Math.min(yMin, -20), yMax * 1.05])
		.range([innerHeight, 0])
		.nice();

	// Y2 scale for policy rate (right axis)
	const rateMax = d3Array.max(data, (d) => d.rate) ?? 10;
	const y2Scale = d3Scale
		.scaleLinear()
		.domain([0, Math.ceil(rateMax)])
		.range([innerHeight, 0]);

	// Stacked area for indexed (bottom when positive)
	const indexedArea = d3Shape
		.area<DataPoint>()
		.x((_d, i) => xScale(i))
		.y0(() => yScale(0))
		.y1((d) => yScale(d.indexed))
		.curve(d3Shape.curveMonotoneX);

	const unindexedArea = d3Shape
		.area<DataPoint>()
		.x((_d, i) => xScale(i))
		.y0(() => yScale(0))
		.y1((d) => yScale(d.unindexed))
		.curve(d3Shape.curveMonotoneX);

	// Rate line
	const rateLine = d3Shape
		.line<DataPoint>()
		.x((_d, i) => xScale(i))
		.y((d) => y2Scale(d.rate))
		.curve(d3Shape.curveStepAfter);

	const yTicks = yScale.ticks(5);
	const y2Ticks = y2Scale.ticks(5);

	return (
		<div className="my-10 w-full max-w-xl">
			{title && (
				<p className="mb-3 text-center text-sm font-medium text-neutral-500">{title}</p>
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

						{/* Zero line */}
						<line
							x1={0}
							x2={innerWidth}
							y1={yScale(0)}
							y2={yScale(0)}
							stroke={TEXT_COLOR}
							strokeWidth={1}
							opacity={0.4}
						/>

						{/* Areas */}
						<path d={indexedArea(data) ?? ""} fill={INDEXED_COLOR} opacity={0.7} />
						<path d={unindexedArea(data) ?? ""} fill={UNINDEXED_COLOR} opacity={0.7} />

						{/* Rate line overlay */}
						<path
							d={rateLine(data) ?? ""}
							fill="none"
							stroke={RATE_COLOR}
							strokeWidth={2}
							strokeDasharray="4 3"
							opacity={0.8}
						/>

						{/* Annotations */}
						{annotations?.map((a) => (
							<g key={a.q}>
								<line
									x1={xScale(a.q)}
									x2={xScale(a.q)}
									y1={0}
									y2={innerHeight}
									stroke={TEXT_COLOR}
									strokeWidth={1}
									strokeDasharray="2 2"
									opacity={0.4}
								/>
								<text
									x={xScale(a.q)}
									y={-2}
									textAnchor="middle"
									fill={TEXT_COLOR}
									fontSize={10}
									fontFamily="var(--font-sans)"
								>
									{a.label}
								</text>
							</g>
						))}

						{/* Y axis labels (left — credit flows) */}
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
								{tick}
							</text>
						))}
						<text
							x={-margin.left + 4}
							y={-4}
							fill={TEXT_COLOR}
							fontSize={11}
							fontFamily="var(--font-sans)"
						>
							bn ISK
						</text>

						{/* Y2 axis labels (right — rate) */}
						{y2Ticks.map((tick) => (
							<text
								key={tick}
								x={innerWidth + 8}
								y={y2Scale(tick)}
								textAnchor="start"
								dominantBaseline="middle"
								fill={RATE_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{tick}%
							</text>
						))}

						{/* X axis */}
						{data.map((_d, i) => {
							const label = Q_LABELS[i];
							if (!label) return null;
							return (
								<text
									key={i}
									x={xScale(i)}
									y={innerHeight + 18}
									textAnchor="middle"
									fill={TEXT_COLOR}
									fontSize={12}
									fontFamily="var(--font-sans)"
								>
									{label}
								</text>
							);
						})}

						{/* Legend */}
						<g transform={`translate(0, ${innerHeight + 34})`}>
							<rect
								x={0}
								y={-5}
								width={12}
								height={10}
								fill={INDEXED_COLOR}
								rx={2}
								opacity={0.7}
							/>
							<text
								x={16}
								y={0}
								dominantBaseline="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								Indexed (verðtryggt)
							</text>
							<rect
								x={150}
								y={-5}
								width={12}
								height={10}
								fill={UNINDEXED_COLOR}
								rx={2}
								opacity={0.7}
							/>
							<text
								x={166}
								y={0}
								dominantBaseline="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								Non-indexed
							</text>
							<line
								x1={280}
								x2={300}
								y1={0}
								y2={0}
								stroke={RATE_COLOR}
								strokeWidth={2}
								strokeDasharray="4 3"
							/>
							<text
								x={306}
								y={0}
								dominantBaseline="middle"
								fill={RATE_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								Policy rate
							</text>
						</g>
					</g>
				</svg>
			</div>
		</div>
	);
}
