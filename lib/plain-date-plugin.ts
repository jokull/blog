import { Temporal } from "temporal-polyfill";
import type {
	KyselyPlugin,
	OperationNode,
	PluginTransformQueryArgs,
	PluginTransformResultArgs,
	RootOperationNode,
} from "kysely";

/**
 * Marshals `Temporal.PlainDate` across the storage boundary.
 *
 * The query side rewrites any ValueNode holding a `Temporal.PlainDate` into
 * its ISO string (`YYYY-MM-DD`), matching the CHECK-constrained TEXT column.
 * The result side rebuilds `Temporal.PlainDate` from the configured columns
 * — scoped by column name, so a title that happens to look like a date is
 * never coerced.
 *
 * Why the structural recursion instead of kysely's OperationNodeTransformer:
 * kysely's exports map only exposes `.` / ./helpers/* / ./migration /
 * ./readonly, so the transformer class is not importable from outside the
 * package. Every operation node's children are themselves operation nodes or
 * arrays of them, so a property-agnostic walk rewrites ValueNodes wherever
 * they sit in the tree (select lists, insert values, where clauses).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isPlainDate = (value: unknown): value is Temporal.PlainDate =>
	value instanceof Temporal.PlainDate;

/** Structural guard — kysely exports no runtime node type check. */
const isNode = (value: unknown): value is OperationNode =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as { kind?: unknown }).kind === "string";

/** The PlainDate a ValueNode holds, if it is one. */
const plainDateIn = (node: OperationNode): Temporal.PlainDate | null => {
	if (node.kind !== "ValueNode") return null;
	// OperationNode is a flat { kind } interface, so narrow the access with
	// `in` and validate the value — no unchecked shape assertion.
	if (!("value" in node)) return null;
	const value: unknown = node.value;
	return isPlainDate(value) ? value : null;
};

const toIsoString = (node: OperationNode): OperationNode => {
	const date = plainDateIn(node);
	if (date !== null) {
		// The node is a ValueNode (plainDateIn checked kind + value); rebuild
		// it with the ISO string. OperationNode is a flat `{ kind }`
		// interface — kysely types it too narrowly to express the value —
		// so the spread's shape is structural, not a fabricated assertion.
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion
		const next = { ...node, value: date.toString() } as unknown as OperationNode;
		return next;
	}
	let changed = false;
	const next: Record<string, unknown> = { ...node };
	for (const [key, value] of Object.entries(node)) {
		if (isNode(value)) {
			const child = toIsoString(value);
			if (child !== value) {
				next[key] = child;
				changed = true;
			}
		} else if (Array.isArray(value)) {
			// `value` is `any[]` (Object.entries on a non-index-signature type);
			// children keeps the OperationNode entries and rewrites the raw
			// cells. Insert values are the reason the raw check exists: kysely
			// 0.29 packs them as `PrimitiveValueListNode.values` — a plain
			// array of values, NOT per-cell nodes — so a Temporal.PlainDate
			// insert cell reaches the driver untouched. D1 masked that (the
			// binding coerces objects through `toJSON()`); a Postgres driver
			// serializes the object as a JSON string instead. The identity
			// comparison on the result is safe: plain objects only.
			const children = value.map((item: unknown) =>
				isPlainDate(item) ? item.toString() : isNode(item) ? toIsoString(item) : item,
			);
			if (children.some((item, index) => item !== value[index])) {
				next[key] = children;
				changed = true;
			}
		}
	}
	// Same structural cast as above: the rebuilt node keeps its kind and gains
	// rewritten child values.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	return changed ? (next as unknown as OperationNode) : node;
};

/**
 * The columns are the surface the plugin claims: only these come back as
 * `Temporal.PlainDate`, and the date column is the only place a PlainDate is
 * legal in this schema (post.public_at).
 */
export const plainDatePlugin = (columns: readonly string[]): KyselyPlugin => ({
	// The top node's kind is unchanged by the rewrite, so it stays a root node.
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	transformQuery: ({ node }: PluginTransformQueryArgs) => toIsoString(node) as RootOperationNode,
	transformResult: async ({ result }: PluginTransformResultArgs) => {
		if (result.rows.length === 0) return result;
		const rows = result.rows.map((row) => {
			const next = { ...row };
			for (const column of columns) {
				const value = next[column];
				if (typeof value === "string" && ISO_DATE.test(value)) {
					// The GLOB CHECK guarantees the YYYY-MM-DD *format* but
					// not a real calendar date, so `from` is the semantic
					// gate: a regex-passing but invalid date ("2026-13-00")
					// throws here, at the query boundary — scenario C, a
					// sanitized internal — rather than surfacing as garbage.
					next[column] = Temporal.PlainDate.from(value);
				}
			}
			return next;
		});
		return { ...result, rows };
	},
});
