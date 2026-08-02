import { env } from "cloudflare:workers";
import { andThen, map, type Result } from "result-rpc";
import * as v from "valibot";
import { safeFetchJson, safeParse, type FetchJsonError, type SchemaError } from "./safe-utils";

const API_ENDPOINT = "https://api.onedollarstats.com/api";
const SITE = "solberg.is";

const dateRangeSchema = v.union([
	v.picklist(["day", "7d", "30d", "6mo", "12mo", "year", "all"]),
	v.tuple([v.string(), v.string()]),
]);

const metricSchema = v.picklist([
	"visitors",
	"visits",
	"pageviews",
	"views_per_visit",
	"bounce_rate",
	"visit_duration",
	"events",
]);

const oneDollarStatsResponseSchema = v.object({
	results: v.array(
		v.object({
			dimensions: v.array(v.string()),
			metrics: v.array(v.number()),
		}),
	),
	meta: v.object({
		imports_included: v.optional(v.boolean()),
		imports_skip_reason: v.optional(v.string()),
		imports_warning: v.optional(v.string()),
		metric_warnings: v.optional(
			v.record(v.string(), v.object({ code: v.string(), warning: v.string() })),
		),
		time_labels: v.optional(v.array(v.string())),
		total_rows: v.optional(v.number()),
	}),
	query: v.record(v.string(), v.unknown()),
});

const dailyVisitSchema = v.object({
	date: v.string(),
	visitors: v.number(),
	visits: v.number(),
	pageviews: v.number(),
});

const statsSchema = v.object({
	visitors: v.number(),
	visits: v.number(),
	pageviews: v.number(),
});

type DateRange = v.InferOutput<typeof dateRangeSchema>;
type Metric = v.InferOutput<typeof metricSchema>;
type OneDollarStatsResponse = v.InferOutput<typeof oneDollarStatsResponseSchema>;
export type DailyVisit = v.InferOutput<typeof dailyVisitSchema>;
export type Stats = v.InferOutput<typeof statsSchema>;

type OneDollarStatsError = FetchJsonError | SchemaError;

interface OneDollarStatsRequest {
	site_id: string;
	metrics: Metric[];
	date_range: DateRange;
	dimensions?: string[];
	filters?: unknown[];
	order_by?: [string, "asc" | "desc"][];
	include?: {
		imports?: boolean;
		time_labels?: boolean;
		total_rows?: boolean;
	};
	pagination?: {
		limit?: number;
		offset?: number;
	};
}

export class OneDollarStatsClient {
	private apiKey: string;
	private siteId: string;

	constructor(siteId: string) {
		this.apiKey = env.ONEDOLLARSTATS_API_KEY;
		this.siteId = siteId;
	}

	private async request(
		body: Omit<OneDollarStatsRequest, "site_id">,
	): Promise<Result<OneDollarStatsResponse, OneDollarStatsError>> {
		const fetchResult = await safeFetchJson(API_ENDPOINT, {
			method: "POST",
			headers: {
				"x-api-key": this.apiKey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...body,
				site_id: this.siteId,
			}),
		});
		return andThen(fetchResult, safeParse(oneDollarStatsResponseSchema));
	}

	/**
	 * Get daily visits for a given date range
	 */
	async getDailyVisits(
		dateRange: DateRange = "30d",
	): Promise<Result<DailyVisit[], OneDollarStatsError>> {
		const result = await this.request({
			metrics: ["visitors", "visits", "pageviews"],
			date_range: dateRange,
			dimensions: ["time:day"],
			order_by: [["time:day", "asc"]],
		});
		return map(result, (response) =>
			response.results.map((r) => ({
				date: r.dimensions[0],
				visitors: r.metrics[0],
				visits: r.metrics[1],
				pageviews: r.metrics[2],
			})),
		);
	}

	/**
	 * Get weekly visits for a given date range
	 */
	async getWeeklyVisits(
		dateRange: DateRange = "6mo",
	): Promise<Result<DailyVisit[], OneDollarStatsError>> {
		const result = await this.request({
			metrics: ["visitors", "visits", "pageviews"],
			date_range: dateRange,
			dimensions: ["time:week"],
			order_by: [["time:week", "asc"]],
		});
		return map(result, (response) =>
			response.results.map((r) => ({
				date: r.dimensions[0],
				visitors: r.metrics[0],
				visits: r.metrics[1],
				pageviews: r.metrics[2],
			})),
		);
	}

	/**
	 * Get aggregate stats for a date range
	 */
	async getStats(dateRange: DateRange = "30d"): Promise<Result<Stats, OneDollarStatsError>> {
		const result = await this.request({
			metrics: ["visitors", "visits", "pageviews"],
			date_range: dateRange,
		});
		return map(result, (response) => {
			if (response.results.length === 0) {
				return { visitors: 0, visits: 0, pageviews: 0 };
			}
			const [visitors, visits, pageviews] = response.results[0].metrics;
			return { visitors, visits, pageviews };
		});
	}

	/**
	 * Get pageviews broken down by page path for a given date range
	 */
	async getPageviews(
		dateRange: DateRange = "7d",
	): Promise<Result<Map<string, number>, OneDollarStatsError>> {
		const result = await this.request({
			metrics: ["pageviews"],
			date_range: dateRange,
			dimensions: ["event:page"],
			order_by: [["pageviews", "desc"]],
			pagination: { limit: 500 },
		});
		return map(result, (response) => {
			const byPath = new Map<string, number>();
			for (const r of response.results) {
				byPath.set(r.dimensions[0], r.metrics[0]);
			}
			return byPath;
		});
	}
}

/**
 * Create a OneDollarStats client for the current site
 */
export function createStatsClient(): OneDollarStatsClient {
	return new OneDollarStatsClient(SITE);
}
