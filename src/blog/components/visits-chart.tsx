import { LineChart } from "@/components/ui/line-chart";
import type { ChartPoint } from "../models";

export function VisitsChart({
	daily,
	weekly,
}: {
	daily: readonly ChartPoint[];
	weekly: readonly ChartPoint[];
}) {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border p-6">
				<h2 className="mb-4 font-semibold text-xl">Recent Activity (30 Days)</h2>
				<div className="h-[250px]">
					<LineChart
						data={[...daily]}
						dataKey="date"
						config={{ Visits: { label: "Visits", color: "chart-1" } }}
					/>
				</div>
			</div>

			<div className="rounded-lg border p-6">
				<h2 className="mb-4 font-semibold text-xl">6-Month Overview (Weekly)</h2>
				<div className="h-[300px]">
					<LineChart
						data={[...weekly]}
						dataKey="date"
						config={{ Visits: { label: "Visits", color: "chart-1" } }}
					/>
				</div>
			</div>
		</div>
	);
}
