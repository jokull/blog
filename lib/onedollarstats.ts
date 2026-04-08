import { Result } from "better-result";
import { z } from "zod";
import { env } from "@/env";
import { safeFetchJson, safeZodParse, type FetchJsonError, type ZodParseError } from "./safe-utils";

const API_ENDPOINT = "https://api.onedollarstats.com/api";
const SITE = "solberg.is";

// Zod schemas
const dateRangeSchema = z.union([
	z.enum(["day", "7d", "30d", "6mo", "12mo", "year", "all"]),
	z.tuple([z.string(), z.string()]),
]);

const metricSchema = z.enum([
	"visitors",
	"visits",
	"pageviews",
	"views_per_visit",
	"bounce_rate",
	"visit_duration",
	"events",
]);

const oneDollarStatsResponseSchema = z.object({
	results: z.array(
		z.object({
			dimensions: z.array(z.string()),
			metrics: z.array(z.number()),
		}),
	),
	meta: z.object({
		imports_included: z.boolean().optional(),
		imports_skip_reason: z.string().optional(),
		imports_warning: z.string().optional(),
		metric_warnings: z
			.record(z.string(), z.object({ code: z.string(), warning: z.string() }))
			.optional(),
		time_labels: z.array(z.string()).optional(),
		total_rows: z.number().optional(),
	}),
	query: z.record(z.string(), z.unknown()),
});

const dailyVisitSchema = z.object({
	date: z.string(),
	visitors: z.number(),
	visits: z.number(),
	pageviews: z.number(),
});

const statsSchema = z.object({
	visitors: z.number(),
	visits: z.number(),
	pageviews: z.number(),
});

// Types inferred from schemas
type DateRange = z.infer<typeof dateRangeSchema>;
type Metric = z.infer<typeof metricSchema>;
type OneDollarStatsResponse = z.infer<typeof oneDollarStatsResponseSchema>;
export type DailyVisit = z.infer<typeof dailyVisitSchema>;
export type Stats = z.infer<typeof statsSchema>;

// Error types
type OneDollarStatsError = FetchJsonError | ZodParseError;

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
		if (fetchResult.isErr()) return Result.err(fetchResult.error);
		return safeZodParse(oneDollarStatsResponseSchema)(fetchResult.value);
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
		return result.map((response) =>
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
		return result.map((response) =>
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
		return result.map((response) => {
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
		return result.map((response) => {
			const map = new Map<string, number>();
			for (const r of response.results) {
				map.set(r.dimensions[0], r.metrics[0]);
			}
			return map;
		});
	}
}

/**
 * Create a OneDollarStats client for the current site
 */
export function createStatsClient(): OneDollarStatsClient {
	return new OneDollarStatsClient(SITE);
}
