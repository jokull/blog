import langBash from "@shikijs/langs/bash";
import langCss from "@shikijs/langs/css";
import langHtml from "@shikijs/langs/html";
import langJson from "@shikijs/langs/json";
import langJsx from "@shikijs/langs/jsx";
import langMarkdown from "@shikijs/langs/markdown";
import langPython from "@shikijs/langs/python";
import langSql from "@shikijs/langs/sql";
import langTsx from "@shikijs/langs/tsx";
import langTypescript from "@shikijs/langs/typescript";
import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { createCssVariablesTheme, createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import { ClipboardCopyButton } from "./app/(default)/[slug]/_components/clipboard-copy-button";
import { BlockSideTitle } from "./components/block-sidetitle";
import {
	D3AreaChart,
	D3BalanceChart,
	D3BarChart,
	D3LineChart,
	D3MortgageChart,
	D3StockFlowChart,
} from "./components/charts";
import { PhotoCaption } from "./components/photo-caption";
import { Tool } from "./components/tool";
import { Card } from "./components/tweet-card";

const cssVariablesTheme = createCssVariablesTheme({});

// JS RegExp engine instead of default Oniguruma WASM — required for Cloudflare Workers
// where dynamic WASM instantiation fails. Regression: some edge-case grammars may
// highlight differently vs the Oniguruma engine. Languages must be pre-bundled here.
const highlighter = createHighlighterCore({
	themes: [cssVariablesTheme],
	langs: [
		langJsx,
		langTsx,
		langTypescript,
		langBash,
		langJson,
		langHtml,
		langCss,
		langPython,
		langSql,
		langMarkdown,
	],
	engine: createJavaScriptRegexEngine(),
});

interface CodeProps {
	children?: ReactNode;
	className?: string;
}

interface ImgProps {
	src: string;
	alt?: string;
	title?: string;
}

interface AnchorProps extends Omit<ComponentProps<typeof Link>, "href"> {
	href?: string;
}

export const components: MDXComponents = {
	// eslint-disable-next-line jsx-a11y/heading-has-content -- content is passed via props spread
	h1: (props) => <h1 className="mb-7 text-balance font-semibold text-neutral-600" {...props} />,
	h2: (props) => (
		// eslint-disable-next-line jsx-a11y/heading-has-content -- content is passed via props spread
		<h2
			className="mt-14 mb-7 max-w-xl text-balance font-semibold text-neutral-600"
			{...props}
		/>
	),
	h3: (props) => (
		// eslint-disable-next-line jsx-a11y/heading-has-content -- content is passed via props spread
		<h3
			className="mt-14 mb-7 max-w-xl text-balance font-semibold text-neutral-600"
			{...props}
		/>
	),
	ul: (props) => (
		<ul
			className="mt-7 max-w-xl list-outside list-disc pl-5 marker:text-neutral-300"
			{...props}
		/>
	),
	ol: (props) => (
		<ol
			className="mt-7 max-w-xl list-outside list-decimal pl-5 marker:text-neutral-300"
			{...props}
		/>
	),
	li: (props) => <li className="pl-1.5 [&>p:first-child]:mt-0" {...props} />,
	a: ({ href, ...props }: AnchorProps) => (
		<Link
			className="break-words underline decoration-blue-300 decoration-from-font underline-offset-2 hover:decoration-blue-600 focus:outline-none focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-opacity-50 focus-visible:ring-offset-2"
			href={href ?? "#"}
			draggable={false}
			{...(href?.startsWith("https://")
				? {
						target: "_blank",
						rel: "noopener noreferrer",
					}
				: {})}
			{...props}
		/>
	),
	strong: (props) => <strong className="font-bold" {...props} />,
	p: (props) => <p className="mt-7 max-w-xl" {...props} />,
	blockquote: (props) => (
		<blockquote
			className="-ml-6 sm:-ml-10 md:-ml-14 max-w-xl pl-6 not-mobile:text-blue-400 sm:pl-10 md:pl-14"
			{...props}
		/>
	),
	pre: (props) => (
		<pre
			className="relative mt-7 max-w-3xl whitespace-pre rounded-sm border border-neutral-950/10 px-4 py-3.5 shadow-xl/5 md:whitespace-pre-wrap"
			{...props}
		/>
	),
	code: async (props: CodeProps) => {
		if (typeof props.children === "string") {
			// Check if this is a code block (multi-line) or inline code (single line)
			const isCodeBlock = props.children.includes("\n") || props.children.length > 50;

			let code: string | null = null;
			try {
				const hl = await highlighter;
				code = hl.codeToHtml(props.children, {
					lang: "jsx",
					theme: "css-variables",
					transformers: [
						{
							// Since we're using dangerouslySetInnerHTML, the code and pre
							// tags should be removed.
							pre: (hast) => {
								if (hast.children.length !== 1) {
									throw new Error("<pre>: Expected a single <code> child");
								}
								if (hast.children[0].type !== "element") {
									throw new Error("<pre>: Expected a <code> child");
								}
								return hast.children[0];
							},
							postprocess(html) {
								return html.replace(/^<code>|<\/code>$/g, "");
							},
						},
					],
				});
			} catch (error) {
				console.error("[shiki] codeToHtml failed, falling back to plain code:", error);
			}

			// Fallback: render unstyled code if shiki fails (e.g. WASM not available on Workers)
			if (!code) {
				return (
					<>
						{isCodeBlock && (
							<span className="absolute right-2.5 bottom-2.5 rounded-xs border bg-white/5 px-2 py-px font-medium font-sans text-xs leading-0 backdrop-blur-md [&>button]:text-neutral-500 [&>button]:decoration-0">
								<ClipboardCopyButton text={props.children}>
									Copy
								</ClipboardCopyButton>
							</span>
						)}
						<code className="inline text-[0.805rem]">{props.children}</code>
					</>
				);
			}

			return (
				<>
					{/* Copy button - only show for code blocks, not inline code */}
					{isCodeBlock && (
						<span className="absolute right-2.5 bottom-2.5 rounded-xs border bg-white/5 px-2 py-px font-medium font-sans text-xs leading-0 backdrop-blur-md [&>button]:text-neutral-500 [&>button]:decoration-0">
							<ClipboardCopyButton text={props.children}>Copy</ClipboardCopyButton>
						</span>
					)}
					<code
						className="shiki css-variables inline text-[0.805rem]"
						// eslint-disable-next-line react/no-danger -- I know what I'm doing
						dangerouslySetInnerHTML={{ __html: code }}
					/>
				</>
			);
		}

		return <code className="inline" {...props} />;
	},
	Card,
	Image,
	img: async ({ src, alt = "", title }: ImgProps) => {
		let img: ReactNode;

		if (src.startsWith("https://") || src.startsWith("/")) {
			img = (
				<img
					className="mt-7 max-w-[minmax(100%,576px)] rounded-xl"
					src={src}
					alt={alt}
					draggable={false}
				/>
			);
		} else {
			try {
				// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
				const image = (await import(`./assets/images/${src}`)) as {
					default: import("next/image").StaticImageData;
				};
				img = (
					<Image
						key={src}
						className="mt-7 rounded-xl"
						src={image.default}
						alt={alt}
						quality={95}
						placeholder="blur"
						draggable={false}
					/>
				);
			} catch (_error) {
				// Fallback for missing images
				img = (
					<div className="mt-7 rounded-xl border bg-gray-100 p-4">
						<p>Image not found: {src}</p>
					</div>
				);
			}
		}

		if (title) {
			return <BlockSideTitle title={title}>{img}</BlockSideTitle>;
		}

		return img;
	},
	table: (props) => (
		<div className="-ml-3 mt-7 overflow-x-auto">
			<table className="border-separate border-spacing-x-3 border-spacing-y-0" {...props} />
		</div>
	),
	thead: (props) => (
		<thead
			className="[&_td]:border-b [&_td]:border-neutral-300 [&_td]:font-semibold [&_td]:whitespace-nowrap [&_td]:text-neutral-600"
			{...props}
		/>
	),
	th: (props) => (
		<th
			className="border-b border-neutral-300 py-2 text-left font-semibold whitespace-nowrap text-neutral-600"
			{...props}
		/>
	),
	td: (props) => <td className="border-b border-neutral-200 py-2 text-left" {...props} />,
	hr: (props) => <hr className="my-14 w-24 max-w-xl border-blue-border" {...props} />,
	BlockSideTitle,
	Tool,
	PhotoCaption,
	D3LineChart,
	D3BarChart,
	D3AreaChart,
	D3MortgageChart,
	D3BalanceChart,
	D3StockFlowChart,
};

export function useMDXComponents(inherited: MDXComponents): MDXComponents {
	return {
		...inherited,
		...components,
	};
}
