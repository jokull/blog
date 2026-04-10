"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useChartDimensions(margin = { top: 20, right: 20, bottom: 40, left: 50 }) {
	const ref = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [height, setHeight] = useState(0);

	const onResize = useCallback(() => {
		if (ref.current) {
			setWidth(ref.current.clientWidth);
			setHeight(ref.current.clientHeight);
		}
	}, []);

	useEffect(() => {
		onResize();
		const observer = new ResizeObserver(onResize);
		if (ref.current) observer.observe(ref.current);
		return () => {
			observer.disconnect();
		};
	}, [onResize]);

	const innerWidth = Math.max(0, width - margin.left - margin.right);
	const innerHeight = Math.max(0, height - margin.top - margin.bottom);

	return { ref, width, height, innerWidth, innerHeight, margin };
}
