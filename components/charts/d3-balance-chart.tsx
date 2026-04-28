"use client";

import * as d3Array from "d3-array";
import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import { BLUE, GRID_COLOR, RED, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

interface BalanceDatum {
	year: number | string;
	additions: number;
	salesExits: number;
	rentExits: number;
	cumulative: number;
}

interface D3BalanceChartProps {
	data: BalanceDatum[];
	title?: string;
	height?: number;
	yLabel?: string;
	xLabel?: string;
	additionsLabel?: string;
	salesLabel?: string;
	rentLabel?: string;
	cumulativeLabel?: string;
	annotations?: { year: number | string; label: string }[];
}

function formatTick(value: number) {
	if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return String(Math.round(value));
}

export function D3BalanceChart({
	data,
	title,
	height = 340,
	yLabel,
	xLabel,
	additionsLabel = "New completions",
	salesLabel = "Sales",
	rentLabel = "Non-profit rental",
	cumulativeLabel = "Cumulative unsold",
	annotations = [],
}: D3BalanceChartProps) {
	const margin = {
		top: 16,
		right: 16,
		bottom: xLabel ? 64 : 56,
		left: yLabel ? 56 : 48,
	};
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

	const xScale = d3Scale
		.scaleBand()
		.domain(data.map((d) => String(d.year)))
		.range([0, innerWidth])
		.padding(0.3);

	const yMaxVal = d3Array.max(data, (d) => Math.max(d.additions, d.cumulative)) ?? 0;
	const yMinVal = -(d3Array.max(data, (d) => d.salesExits + d.rentExits) ?? 0);

	const yScale = d3Scale
		.scaleLinear()
		.domain([yMinVal * 1.08, yMaxVal * 1.08])
		.range([innerHeight, 0])
		.nice();

	const yTicks = yScale.ticks(6);
	const zeroY = yScale(0);
	const barWidth = xScale.bandwidth();

	const ADD_COLOR = BLUE[700];
	const SALES_COLOR = BLUE[300];
	const RENT_COLOR = BLUE[100];
	const LINE_COLOR = RED;

	const line = d3Shape
		.line<BalanceDatum>()
		.x((d) => (xScale(String(d.year)) ?? 0) + barWidth / 2)
		.y((d) => yScale(d.cumulative))
		.curve(d3Shape.curveMonotoneX);

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
								{formatTick(tick)}
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

						{/* Zero line emphasized */}
						<line
							x1={0}
							x2={innerWidth}
							y1={zeroY}
							y2={zeroY}
							stroke={TEXT_COLOR}
							strokeWidth={1.2}
						/>

						{/* Bars */}
						{data.map((d) => {
							const x = xScale(String(d.year)) ?? 0;
							const addH = zeroY - yScale(d.additions);
							const salesH = yScale(-d.salesExits) - zeroY;
							const rentH =
								yScale(-(d.salesExits + d.rentExits)) - yScale(-d.salesExits);
							return (
								<g key={d.year}>
									{/* Additions (positive) */}
									<rect
										x={x}
										y={yScale(d.additions)}
										width={barWidth}
										height={addH}
										fill={ADD_COLOR}
										rx={2}
									/>
									{/* Sales exits (negative) */}
									<rect
										x={x}
										y={zeroY}
										width={barWidth}
										height={salesH}
										fill={SALES_COLOR}
									/>
									{/* Rent exits (negative, stacked below sales) */}
									<rect
										x={x}
										y={yScale(-d.salesExits)}
										width={barWidth}
										height={rentH}
										fill={RENT_COLOR}
									/>
									{/* X-axis year label */}
									<text
										x={x + barWidth / 2}
										y={innerHeight + 18}
										textAnchor="middle"
										fill={TEXT_COLOR}
										fontSize={12}
										fontFamily="var(--font-sans)"
									>
										{d.year}
									</text>
								</g>
							);
						})}

						{/* Cumulative inventory line */}
						<path
							d={line(data) ?? ""}
							fill="none"
							stroke={LINE_COLOR}
							strokeWidth={2.5}
							strokeLinecap="round"
						/>
						{data.map((d) => (
							<circle
								key={`dot-${d.year}`}
								cx={(xScale(String(d.year)) ?? 0) + barWidth / 2}
								cy={yScale(d.cumulative)}
								r={3}
								fill={LINE_COLOR}
							/>
						))}

						{/* Annotations */}
						{annotations.map((a) => {
							const x = (xScale(String(a.year)) ?? 0) + barWidth / 2;
							const datum = data.find((d) => d.year === a.year);
							if (!datum) return null;
							return (
								<text
									key={`ann-${a.year}`}
									x={x}
									y={yScale(datum.cumulative) - 10}
									textAnchor="middle"
									fill={TEXT_COLOR}
									fontSize={11}
									fontFamily="var(--font-sans)"
									fontStyle="italic"
								>
									{a.label}
								</text>
							);
						})}

						{xLabel && (
							<text
								x={innerWidth / 2}
								y={innerHeight + 38}
								textAnchor="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{xLabel}
							</text>
						)}

						{/* Legend */}
						<g transform={`translate(0, ${innerHeight + (xLabel ? 54 : 40)})`}>
							{[
								{ color: ADD_COLOR, label: additionsLabel, x: 0 },
								{ color: SALES_COLOR, label: salesLabel, x: 140 },
								{ color: RENT_COLOR, label: rentLabel, x: 230 },
								{ color: LINE_COLOR, label: cumulativeLabel, x: 340, line: true },
							].map((item) => (
								<g key={item.label} transform={`translate(${item.x}, 0)`}>
									{item.line ? (
										<line
											x1={0}
											x2={14}
											y1={0}
											y2={0}
											stroke={item.color}
											strokeWidth={2.5}
										/>
									) : (
										<rect
											x={0}
											y={-5}
											width={12}
											height={10}
											fill={item.color}
											rx={2}
										/>
									)}
									<text
										x={18}
										y={0}
										dominantBaseline="middle"
										fill={TEXT_COLOR}
										fontSize={12}
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
