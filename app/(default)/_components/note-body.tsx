import { components } from "@/mdx-components";
import type { MDXComponents } from "mdx/types";
import { SafeMdxRenderer } from "safe-mdx";
import { mdxParse } from "safe-mdx/parse";

/**
 * The post pipeline (`components` from mdx-components) at note scale.
 *
 * Notes are short, curated commentary — they get the same component entry
 * (links, inline code, the whole post component set), but block elements are
 * overridden to 14px with tight spacing instead of the post's mt-7 rhythm.
 * No `prose` classes: this project styles markdown through the component
 * pipeline, not the Tailwind typography plugin.
 */
const noteComponents: MDXComponents = {
	...components,
	// eslint-disable-next-line jsx-a11y/heading-has-content -- content is passed via props spread
	h1: (props) => <h1 className="text-sm font-bold" {...props} />,
	// eslint-disable-next-line jsx-a11y/heading-has-content -- content is passed via props spread
	h2: (props) => <h2 className="text-sm font-bold" {...props} />,
	// eslint-disable-next-line jsx-a11y/heading-has-content -- content is passed via props spread
	h3: (props) => <h3 className="text-sm font-bold" {...props} />,
	p: (props) => <p className="text-sm leading-6 [&:not(:first-child)]:mt-3" {...props} />,
	ul: (props) => (
		<ul
			className="mt-3 list-outside list-disc pl-5 text-sm leading-6 marker:text-neutral-300"
			{...props}
		/>
	),
	ol: (props) => (
		<ol
			className="mt-3 list-outside list-decimal pl-5 text-sm leading-6 marker:text-neutral-300"
			{...props}
		/>
	),
	li: (props) => <li className="pl-1 [&>p:first-child]:mt-0" {...props} />,
	blockquote: (props) => <blockquote className="mt-3 pl-3 text-sm leading-6" {...props} />,
	pre: (props) => (
		<pre
			className="mt-3 overflow-x-auto rounded-sm border border-neutral-950/10 px-3 py-2.5 text-sm"
			{...props}
		/>
	),
	img: (props) => <img className="mt-3 rounded-lg" alt="" {...props} />,
	hr: (props) => <hr className="my-6 w-24 border-blue-border" {...props} />,
};

export function NoteBody({ markdown }: { markdown: string }) {
	try {
		const mdast = mdxParse(markdown);
		return <SafeMdxRenderer mdast={mdast} markdown={markdown} components={noteComponents} />;
	} catch {
		return null;
	}
}
