"use client";
// oxlint-disable typescript-eslint/no-unsafe-type-assertion, typescript-eslint/no-unnecessary-condition

import * as d3Array from "d3-array";
import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import { BLUE, GRID_COLOR, PALETTE, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

type DataPoint = Record<string, number | string | null>;

interface Series {
	key: string;
	label: string;
	color?: string;
	axis?: "left" | "right";
	dashed?: boolean;
}

interface D3LineChartProps {
	data: DataPoint[];
	xKey: string;
	series: Series[];
	title?: string;
	height?: number;
	yLabel?: string;
	xLabel?: string;
	yFormat?: string; // "percent" | "number"
	yFormatRight?: string;
	yDomain?: [number, number];
	yDomainRight?: [number, number];
	yLabelRight?: string;
	annotations?: Array<{ x: number | string; label: string }>;
}

function formatTick(value: number, format?: string) {
	if (format === "percent") return `${Math.round(value)}%`;
	if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
	return String(Math.round(value));
}

export function D3LineChart({
	data,
	xKey,
	series,
	title,
	height = 280,
	yLabel,
	xLabel,
	yFormat,
	yFormatRight,
	yDomain,
	yDomainRight,
	yLabelRight,
	annotations,
}: D3LineChartProps) {
	const hasRightAxis = series.some((s) => s.axis === "right");
	const itemsPerRow = series.length >= 4 ? 2 : series.length;
	const legendRows = series.length > 1 ? Math.ceil(series.length / itemsPerRow) : 0;
	const legendHeight = legendRows * 18;
	const margin = {
		top: annotations?.length ? 36 : 16,
		right: hasRightAxis ? 48 : 16,
		bottom: (xLabel ? 52 : 32) + legendHeight + 8,
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

	const xValues = data.map((d) => d[xKey] as number);
	const xScale = d3Scale
		.scaleLinear()
		.domain(d3Array.extent(xValues) as [number, number])
		.range([0, innerWidth]);

	const leftSeries = series.filter((s) => s.axis !== "right");
	const rightSeries = series.filter((s) => s.axis === "right");

	const leftYValues = leftSeries.flatMap((s) =>
		data.map((d) => d[s.key]).filter((v): v is number => v != null),
	);
	const leftExtent = yDomain ?? (d3Array.extent(leftYValues) as [number, number]);
	const leftPadding = (leftExtent[1] - leftExtent[0]) * 0.08;
	const yScale = d3Scale
		.scaleLinear()
		.domain([
			yDomain ? leftExtent[0] : leftExtent[0] - leftPadding,
			leftExtent[1] + leftPadding,
		])
		.range([innerHeight, 0])
		.nice();

	const rightYValues = rightSeries.flatMap((s) =>
		data.map((d) => d[s.key]).filter((v): v is number => v != null),
	);
	const rightExtentRaw =
		yDomainRight ??
		(rightYValues.length > 0
			? (d3Array.extent(rightYValues) as [number, number])
			: ([0, 1] as [number, number]));
	const rightExtent: [number, number] = yDomainRight
		? rightExtentRaw
		: [Math.min(0, rightExtentRaw[0]), rightExtentRaw[1]];
	const y2Scale = d3Scale.scaleLinear().domain(rightExtent).range([innerHeight, 0]).nice();

	const lineLeft = d3Shape
		.line<DataPoint>()
		.defined((d) => d !== null && d !== undefined)
		.x((d) => xScale(d[xKey] as number))
		.y((d) => yScale(d._y as number))
		.curve(d3Shape.curveMonotoneX);

	const lineRight = d3Shape
		.line<DataPoint>()
		.defined((d) => d !== null && d !== undefined)
		.x((d) => xScale(d[xKey] as number))
		.y((d) => y2Scale(d._y as number))
		.curve(d3Shape.curveStepAfter);

	const yTicks = yScale.ticks(5);
	const y2Ticks = y2Scale.ticks(5);
	const xTicks = xScale.ticks(Math.min(data.length, 8));

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

						{/* Y axis labels (left) */}
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

						{/* Y2 axis labels (right) */}
						{hasRightAxis &&
							y2Ticks.map((tick) => {
								const rightColor = rightSeries[0]?.color ?? TEXT_COLOR;
								return (
									<text
										key={`r-${tick}`}
										x={innerWidth + 8}
										y={y2Scale(tick)}
										textAnchor="start"
										dominantBaseline="middle"
										fill={rightColor}
										fontSize={12}
										fontFamily="var(--font-sans)"
									>
										{formatTick(tick, yFormatRight)}
									</text>
								);
							})}
						{hasRightAxis && yLabelRight && (
							<text
								x={innerWidth + margin.right - 4}
								y={-4}
								textAnchor="end"
								fill={rightSeries[0]?.color ?? TEXT_COLOR}
								fontSize={11}
								fontFamily="var(--font-sans)"
							>
								{yLabelRight}
							</text>
						)}

						{/* X axis labels */}
						{xTicks.map((tick) => (
							<text
								key={tick}
								x={xScale(tick)}
								y={innerHeight + 20}
								textAnchor="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{String(tick)}
							</text>
						))}

						{/* Axis labels */}
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
						{xLabel && (
							<text
								x={innerWidth}
								y={innerHeight + 38}
								textAnchor="end"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{xLabel}
							</text>
						)}

						{/* Lines */}
						{series.map((s, i) => {
							const validData = data.filter((d) => d[s.key] != null);
							const lineData: DataPoint[] = validData.map((d) => ({
								...d,
								_y: d[s.key],
							}));
							const isRight = s.axis === "right";
							const pathD = (isRight ? lineRight : lineLeft)(lineData);
							const color = s.color ?? PALETTE[i % PALETTE.length];
							const last = validData[validData.length - 1];
							const scale = isRight ? y2Scale : yScale;

							return (
								<g key={s.key}>
									<path
										d={pathD ?? ""}
										fill="none"
										stroke={color}
										strokeWidth={2.5}
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeDasharray={s.dashed ? "4 3" : undefined}
									/>
									{/* End dot */}
									{last && (
										<circle
											cx={xScale(last[xKey] as number)}
											cy={scale(last[s.key] as number)}
											r={3.5}
											fill={color}
										/>
									)}
								</g>
							);
						})}

						{/* Annotations */}
						{annotations?.map((a) => {
							const x = xScale(a.x as number);
							return (
								<g key={String(a.x)}>
									<line
										x1={x}
										x2={x}
										y1={0}
										y2={innerHeight}
										stroke={BLUE[900]}
										strokeWidth={1}
										strokeDasharray="3 3"
										opacity={0.5}
									/>
									<text
										x={x}
										y={-20}
										textAnchor="middle"
										fill={BLUE[900]}
										fontSize={10}
										fontFamily="var(--font-sans)"
									>
										{a.label}
									</text>
								</g>
							);
						})}

						{/* Legend */}
						{series.length > 1 && (
							<g transform={`translate(0, ${innerHeight + (xLabel ? 56 : 36)})`}>
								{series.map((s, i) => {
									const color = s.color ?? PALETTE[i % PALETTE.length];
									const col = i % itemsPerRow;
									const row = Math.floor(i / itemsPerRow);
									const colWidth = innerWidth / itemsPerRow;
									const xOffset = col * colWidth;
									const yOffset = row * 18;
									return (
										<g
											key={s.key}
											transform={`translate(${xOffset}, ${yOffset})`}
										>
											<line
												x1={0}
												x2={16}
												y1={0}
												y2={0}
												stroke={color}
												strokeWidth={2.5}
												strokeLinecap="round"
											/>
											<text
												x={22}
												y={0}
												dominantBaseline="middle"
												fill={TEXT_COLOR}
												fontSize={11}
												fontFamily="var(--font-sans)"
											>
												{s.label}
											</text>
										</g>
									);
								})}
							</g>
						)}
					</g>
				</svg>
			</div>
		</div>
	);
}
