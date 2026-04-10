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
	yDomain?: [number, number];
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
	yDomain,
	annotations,
}: D3LineChartProps) {
	const margin = { top: 16, right: 16, bottom: xLabel ? 48 : 32, left: yLabel ? 56 : 48 };
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

	const xValues = data.map((d) => d[xKey] as number);
	const xScale = d3Scale
		.scaleLinear()
		.domain(d3Array.extent(xValues) as [number, number])
		.range([0, innerWidth]);

	const allYValues = series.flatMap((s) =>
		data.map((d) => d[s.key]).filter((v): v is number => v != null),
	);
	const yExtent = yDomain ?? (d3Array.extent(allYValues) as [number, number]);
	const yPadding = (yExtent[1] - yExtent[0]) * 0.08;
	const yScale = d3Scale
		.scaleLinear()
		.domain([yDomain ? yExtent[0] : yExtent[0] - yPadding, yExtent[1] + yPadding])
		.range([innerHeight, 0])
		.nice();

	const line = d3Shape
		.line<DataPoint>()
		.defined((d) => d !== null && d !== undefined)
		.x((d) => xScale(d[xKey] as number))
		.y((d) => yScale(d._y as number))
		.curve(d3Shape.curveMonotoneX);

	const yTicks = yScale.ticks(5);
	const xTicks = xScale.ticks(Math.min(data.length, 8));

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
							const pathD = line(lineData);
							const color = s.color ?? PALETTE[i % PALETTE.length];
							const last = validData[validData.length - 1];

							return (
								<g key={s.key}>
									<path
										d={pathD ?? ""}
										fill="none"
										stroke={color}
										strokeWidth={2.5}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									{/* End dot */}
									{last && (
										<circle
											cx={xScale(last[xKey] as number)}
											cy={yScale(last[s.key] as number)}
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
										y={-4}
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
							<g transform={`translate(0, ${innerHeight + (xLabel ? 36 : 30)})`}>
								{series.map((s, i) => {
									const color = s.color ?? PALETTE[i % PALETTE.length];
									const xOffset = i * 120;
									return (
										<g key={s.key} transform={`translate(${xOffset}, 0)`}>
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
