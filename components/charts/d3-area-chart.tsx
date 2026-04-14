"use client";
// oxlint-disable typescript-eslint/no-unsafe-type-assertion, typescript-eslint/no-unnecessary-condition

import * as d3Array from "d3-array";
import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import { GRID_COLOR, PALETTE, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

interface DataPoint {
	[key: string]: number | string | null;
}

interface Series {
	key: string;
	label: string;
	color?: string;
}

interface D3AreaChartProps {
	data: DataPoint[];
	xKey: string;
	series: Series[];
	title?: string;
	height?: number;
	yLabel?: string;
	xLabel?: string;
	yFormat?: string;
	yDomain?: [number, number];
	stacked?: boolean;
}

function formatTick(value: number, format?: string) {
	if (format === "percent") return `${Math.round(value)}%`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
	if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
	return String(Math.round(value));
}

export function D3AreaChart({
	data,
	xKey,
	series,
	title,
	height = 280,
	yLabel,
	xLabel,
	yFormat,
	yDomain,
	stacked = false,
}: D3AreaChartProps) {
	const margin = { top: 16, right: 16, bottom: xLabel ? 48 : 32, left: yLabel ? 56 : 48 };
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

	let yMax: number;
	if (yDomain) {
		yMax = yDomain[1];
	} else if (stacked) {
		yMax =
			d3Array.max(data, (d) =>
				series.reduce((sum, s) => sum + ((d[s.key] as number) ?? 0), 0),
			) ?? 0;
	} else {
		yMax =
			d3Array.max(
				series.flatMap((s) =>
					data.map((d) => d[s.key]).filter((v): v is number => v != null),
				),
			) ?? 0;
	}

	const yMin = yDomain ? yDomain[0] : 0;
	const yScale = d3Scale
		.scaleLinear()
		.domain([yMin, yMax * 1.05])
		.range([innerHeight, 0])
		.nice();

	const yTicks = yScale.ticks(5);
	const xTicks = xScale.ticks(Math.min(data.length, 8));

	// Build stacked or individual areas
	const areas = series.map((s, i) => {
		const color = s.color ?? PALETTE[i % PALETTE.length];

		if (stacked) {
			// Calculate cumulative values for stacking
			const area = d3Shape
				.area<DataPoint>()
				.x((d) => xScale(d[xKey] as number))
				.y0((d) => {
					// Sum of all series below this one
					const below = series
						.slice(0, i)
						.reduce((sum, prev) => sum + ((d[prev.key] as number) ?? 0), 0);
					return yScale(below);
				})
				.y1((d) => {
					const below = series
						.slice(0, i + 1)
						.reduce((sum, prev) => sum + ((d[prev.key] as number) ?? 0), 0);
					return yScale(below);
				})
				.curve(d3Shape.curveMonotoneX);

			return { key: s.key, color, path: area(data) ?? "", label: s.label };
		}

		const area = d3Shape
			.area<DataPoint>()
			.defined((d) => d[s.key] != null)
			.x((d) => xScale(d[xKey] as number))
			.y0(innerHeight)
			.y1((d) => yScale(d[s.key] as number))
			.curve(d3Shape.curveMonotoneX);

		return { key: s.key, color, path: area(data) ?? "", label: s.label };
	});

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

						{/* Areas — render in reverse for stacked (bottom series first) */}
						{(stacked ? [...areas].reverse() : areas).map((a) => (
							<path
								key={a.key}
								d={a.path}
								fill={a.color}
								opacity={stacked ? 0.85 : 0.15}
								stroke={a.color}
								strokeWidth={stacked ? 0 : 2}
							/>
						))}

						{/* Top line for non-stacked */}
						{!stacked &&
							areas.map((a) => {
								const linePath = d3Shape
									.line<DataPoint>()
									.defined(
										(d) => d[series.find((s) => s.key === a.key)!.key] != null,
									)
									.x((d) => xScale(d[xKey] as number))
									.y((d) =>
										yScale(
											d[series.find((s) => s.key === a.key)!.key] as number,
										),
									)
									.curve(d3Shape.curveMonotoneX)(data);

								return (
									<path
										key={`line-${a.key}`}
										d={linePath ?? ""}
										fill="none"
										stroke={a.color}
										strokeWidth={2.5}
										strokeLinecap="round"
									/>
								);
							})}

						{/* Legend */}
						{series.length > 1 && (
							<g transform={`translate(0, ${innerHeight + (xLabel ? 36 : 30)})`}>
								{series.map((s, i) => {
									const color = s.color ?? PALETTE[i % PALETTE.length];
									const xOffset = i * 130;
									return (
										<g key={s.key} transform={`translate(${xOffset}, 0)`}>
											<rect
												x={0}
												y={-5}
												width={12}
												height={10}
												fill={color}
												rx={2}
												opacity={0.85}
											/>
											<text
												x={18}
												y={0}
												dominantBaseline="middle"
												fill={TEXT_COLOR}
												fontSize={12}
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
