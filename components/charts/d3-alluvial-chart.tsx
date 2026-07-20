"use client";

import { sankeyLinkHorizontal } from "d3-sankey";
import { GRID_COLOR, TEXT_COLOR } from "./colors";
import { useChartDimensions } from "./use-chart-dimensions";

interface AlluvialNodeInput {
	id: string;
	column: number;
	category: string;
	value: number;
	label?: string;
}

interface AlluvialLinkInput {
	source: string;
	target: string;
	value: number;
	transition?: boolean;
}

interface AlluvialColumnMeta {
	column: number;
	label: string;
	newInflow?: number;
}

interface D3AlluvialChartProps {
	nodes: AlluvialNodeInput[];
	links: AlluvialLinkInput[];
	columns: AlluvialColumnMeta[];
	categoryOrder: string[];
	categoryColors: Record<string, string>;
	categoryLabels?: Record<string, string>;
	title?: string;
	height?: number;
	showInflowArrows?: boolean;
}

interface LayoutNode extends AlluvialNodeInput {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
	heightPx: number;
}

interface LayoutLink {
	source: LayoutNode;
	target: LayoutNode;
	value: number;
	width: number;
	y0: number;
	y1: number;
	transition?: boolean;
	id: string;
}

function formatThousands(value: number) {
	if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return String(Math.round(value));
}

export function D3AlluvialChart({
	nodes,
	links,
	columns,
	categoryOrder,
	categoryColors,
	categoryLabels = {},
	title,
	height = 520,
	showInflowArrows = true,
}: D3AlluvialChartProps) {
	const margin = {
		top: showInflowArrows ? 72 : 32,
		right: 40,
		bottom: 56,
		left: 40,
	};
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

	const NODE_WIDTH = 12;
	const NODE_PADDING = 6;

	// Compute column sums to find the tallest column (for vertical scale)
	const sortedColumns = [...columns].sort((a, b) => a.column - b.column);
	const numColumns = sortedColumns.length;

	const colSums = sortedColumns.map((col) =>
		nodes.filter((n) => n.column === col.column).reduce((s, n) => s + n.value, 0),
	);
	const maxColSum = Math.max(...colSums);
	const numCategories = categoryOrder.length;
	const totalPadPerCol = NODE_PADDING * (numCategories - 1);
	const yScale = (innerHeight - totalPadPerCol) / maxColSum;

	// Column x positions
	const totalNodeWidth = numColumns * NODE_WIDTH;
	const totalRibbonSpace = innerWidth - totalNodeWidth;
	const ribbonGap = numColumns > 1 ? totalRibbonSpace / (numColumns - 1) : 0;
	const colX = (col: number) => col * (NODE_WIDTH + ribbonGap);

	// Build layout nodes: position top-to-bottom within each column
	const nodeMap = new Map<string, LayoutNode>();
	for (const col of sortedColumns) {
		const colNodes = nodes
			.filter((n) => n.column === col.column)
			.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));
		let y = 0;
		for (const n of colNodes) {
			const heightPx = n.value * yScale;
			const layoutNode: LayoutNode = {
				...n,
				x0: colX(col.column),
				x1: colX(col.column) + NODE_WIDTH,
				y0: y,
				y1: y + heightPx,
				heightPx,
			};
			nodeMap.set(n.id, layoutNode);
			y = layoutNode.y1 + NODE_PADDING;
		}
	}

	// Build layout links: stack outgoing from top of source, incoming from top of target
	// Sort outgoing by target.y0 ascending (top-target first)
	// Sort incoming by source.y0 ascending (top-source first)
	// This keeps persistence straight and transitions crossing minimally
	const srcOutOffset = new Map<string, number>();
	const tgtInOffset = new Map<string, number>();
	for (const id of nodeMap.keys()) {
		srcOutOffset.set(id, 0);
		tgtInOffset.set(id, 0);
	}

	// Group links by source and by target so we can process per-node
	const linksBySource = new Map<string, AlluvialLinkInput[]>();
	const linksByTarget = new Map<string, AlluvialLinkInput[]>();
	for (const link of links) {
		if (!linksBySource.has(link.source)) linksBySource.set(link.source, []);
		if (!linksByTarget.has(link.target)) linksByTarget.set(link.target, []);
		linksBySource.get(link.source)?.push(link);
		linksByTarget.get(link.target)?.push(link);
	}

	// For each source node, sort outgoing by target y0 and assign srcOffset
	const linkSrcOffset = new Map<string, number>();
	for (const [srcId, outLinks] of linksBySource.entries()) {
		const sorted = [...outLinks].sort((a, b) => {
			const ta = nodeMap.get(a.target);
			const tb = nodeMap.get(b.target);
			return (ta?.y0 ?? 0) - (tb?.y0 ?? 0);
		});
		let offset = 0;
		for (const link of sorted) {
			const linkKey = `${link.source}->${link.target}`;
			linkSrcOffset.set(linkKey, offset);
			offset += link.value * yScale;
		}
		srcOutOffset.set(srcId, offset);
	}

	// For each target node, sort incoming by source y0 and assign tgtOffset
	const linkTgtOffset = new Map<string, number>();
	for (const [tgtId, inLinks] of linksByTarget.entries()) {
		const sorted = [...inLinks].sort((a, b) => {
			const sa = nodeMap.get(a.source);
			const sb = nodeMap.get(b.source);
			return (sa?.y0 ?? 0) - (sb?.y0 ?? 0);
		});
		let offset = 0;
		for (const link of sorted) {
			const linkKey = `${link.source}->${link.target}`;
			linkTgtOffset.set(linkKey, offset);
			offset += link.value * yScale;
		}
		tgtInOffset.set(tgtId, offset);
	}

	// Build final layout links
	const layoutLinks: LayoutLink[] = [];
	for (const link of links) {
		const src = nodeMap.get(link.source);
		const tgt = nodeMap.get(link.target);
		if (!src || !tgt) continue;
		const width = link.value * yScale;
		const linkKey = `${link.source}->${link.target}`;
		const srcOffset = linkSrcOffset.get(linkKey) ?? 0;
		const tgtOffset = linkTgtOffset.get(linkKey) ?? 0;
		layoutLinks.push({
			source: src,
			target: tgt,
			value: link.value,
			width,
			y0: src.y0 + srcOffset + width / 2,
			y1: tgt.y0 + tgtOffset + width / 2,
			transition: link.transition,
			id: linkKey,
		});
	}

	const linkPath = sankeyLinkHorizontal<LayoutNode, LayoutLink>();

	// Render: background fill on each node, then ribbons on top, then foreground node stubs
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
						{/* Column dividers / background gridlines */}
						{sortedColumns.map((col) => (
							<line
								key={`divider-${col.column}`}
								x1={colX(col.column) + NODE_WIDTH / 2}
								x2={colX(col.column) + NODE_WIDTH / 2}
								y1={-8}
								y2={innerHeight + 4}
								stroke={GRID_COLOR}
								strokeWidth={1}
								strokeDasharray="1 4"
							/>
						))}

						{/* Ribbons (links) */}
						{layoutLinks.map((link) => {
							const color =
								categoryColors[
									link.transition ? link.target.category : link.source.category
								] ?? TEXT_COLOR;
							return (
								<path
									key={link.id}
									d={linkPath(link) ?? ""}
									fill="none"
									stroke={color}
									strokeOpacity={link.transition ? 0.65 : 0.35}
									strokeWidth={Math.max(2, link.width)}
								/>
							);
						})}

						{/* Nodes */}
						{[...nodeMap.values()].map((node) => {
							const color = categoryColors[node.category] ?? TEXT_COLOR;
							const renderedHeight = Math.max(3, node.heightPx);
							return (
								<g key={node.id}>
									<rect
										x={node.x0}
										y={node.y0}
										width={node.x1 - node.x0}
										height={renderedHeight}
										fill={color}
										opacity={0.95}
									/>
									{node.heightPx > 16 && (
										<text
											x={node.x1 + 4}
											y={node.y0 + node.heightPx / 2}
											dominantBaseline="middle"
											fill={TEXT_COLOR}
											fontSize={10}
											fontFamily="var(--font-sans)"
										>
											{formatThousands(node.value)}
										</text>
									)}
								</g>
							);
						})}

						{/* Inflow annotations: at the top of each column, arrow pointing down into the column */}
						{showInflowArrows &&
							sortedColumns.map((col) => {
								if (!col.newInflow) return null;
								const cx = colX(col.column) + NODE_WIDTH / 2;
								const topY = -margin.top + 14;
								const botY = -8;
								return (
									<g key={`inflow-${col.column}`}>
										<text
											x={cx}
											y={topY}
											textAnchor="middle"
											fill={TEXT_COLOR}
											fontSize={11}
											fontFamily="var(--font-sans)"
										>
											+{formatThousands(col.newInflow)}
										</text>
										<line
											x1={cx}
											x2={cx}
											y1={topY + 4}
											y2={botY - 5}
											stroke={TEXT_COLOR}
											strokeWidth={1.2}
											strokeDasharray="3 3"
										/>
										<path
											d={`M ${cx - 3.5} ${botY - 5} L ${cx} ${botY} L ${cx + 3.5} ${botY - 5} Z`}
											fill={TEXT_COLOR}
										/>
									</g>
								);
							})}

						{/* Column labels below the chart */}
						{sortedColumns.map((col) => (
							<text
								key={`col-${col.column}`}
								x={colX(col.column) + NODE_WIDTH / 2}
								y={innerHeight + 20}
								textAnchor="middle"
								fill={TEXT_COLOR}
								fontSize={12}
								fontFamily="var(--font-sans)"
							>
								{col.label}
							</text>
						))}

						{/* Legend */}
						<g transform={`translate(0, ${innerHeight + 40})`}>
							{categoryOrder.map((cat, i) => {
								const color = categoryColors[cat] ?? TEXT_COLOR;
								const label = categoryLabels[cat] ?? cat;
								const x = i * 200;
								return (
									<g key={cat} transform={`translate(${x}, 0)`}>
										<rect
											x={0}
											y={-6}
											width={12}
											height={12}
											fill={color}
											rx={2}
											opacity={0.95}
										/>
										<text
											x={18}
											y={0}
											dominantBaseline="middle"
											fill={TEXT_COLOR}
											fontSize={11}
											fontFamily="var(--font-sans)"
										>
											{label}
										</text>
									</g>
								);
							})}
						</g>
					</g>
				</svg>
			</div>
		</div>
	);
}
