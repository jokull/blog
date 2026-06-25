"use client";

import { Portal } from "@headlessui/react";
import { default as MonacoEditor } from "@monaco-editor/react";
import { useDebouncedCallback } from "@tanstack/react-pacer/debouncer";
import type { InferSelectModel } from "drizzle-orm";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Post } from "@/schema";
import { previewPost, togglePublishPost, updatePost } from "../server";
import { DateInput } from "./date-input";
import { Preview } from "./preview";

export function Editor({ mdx, ...props }: { post: InferSelectModel<typeof Post>; mdx: ReactNode }) {
	const [post, setPost] = useState({
		...props.post,
		previewMarkdown: props.post.previewMarkdown ?? props.post.markdown,
	});

	const debouncedSavePreview = useDebouncedCallback(
		(value: string) => {
			void previewPost({ data: { slug: post.slug, previewMarkdown: value } });
		},
		{
			wait: 2000,
		},
	);

	const isTitleModified = post.title !== props.post.title;
	const isDateModified = post.publishedAt.getTime() !== props.post.publishedAt.getTime();
	const isLocaleModified = post.locale !== props.post.locale;
	const isMarkdownModified = post.previewMarkdown !== props.post.markdown;

	const unsavedChanges =
		isTitleModified || isDateModified || isLocaleModified || isMarkdownModified;

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (unsavedChanges) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [unsavedChanges]);

	const onChange = useCallback(
		(value: string | undefined) => {
			if (value) {
				setPost((prevPost) => ({ ...prevPost, previewMarkdown: value })); // Immediate local state update
				debouncedSavePreview(value); // Debounced server action
			}
		},
		[debouncedSavePreview],
	);

	return (
		<>
			<Portal>
				<div className="-translate-1/2 absolute bottom-0 left-1/2 flex w-2xl flex-col gap-2 rounded-2xl bg-white/20 p-4 shadow-2xl backdrop-blur-lg">
					<Input
						value={post.title}
						onChange={(event) => {
							setPost({ ...post, title: event.target.value });
						}}
					/>
					<div className="flex items-center justify-end gap-2">
						<DateInput
							value={post.publishedAt.toISOString().slice(0, 10)}
							onChange={(value) => {
								if (!value) {
									return;
								}
								setPost({ ...post, publishedAt: new Date(value) });
							}}
						/>
						<Select
							selectedKey={post.locale}
							onSelectionChange={(value) => {
								if (value === "is" || value === "en") {
									setPost({ ...post, locale: value });
								}
							}}
							placeholder="Select language"
						>
							<SelectTrigger />
							<SelectContent>
								<SelectItem id="en">English</SelectItem>
								<SelectItem id="is">Íslenska</SelectItem>
							</SelectContent>
						</Select>
						<Preview post={post}>{mdx}</Preview>
						<form
							className="contents"
							onSubmit={(event) => {
								event.preventDefault();
								void togglePublishPost({ data: { slug: post.slug } });
							}}
						>
							<Button type="submit" intent="secondary" className="group relative">
								<span className="pointer-events-none invisible select-none">
									Unpublished
								</span>
								<span className="absolute group-hover:hidden">
									{props.post.publicAt ? "Published" : "Unpublished"}
								</span>
								<span className="absolute hidden group-hover:inline">
									{props.post.publicAt ? "Unpublish" : "Publish"}
								</span>
							</Button>
						</form>
						<form
							className="contents"
							onSubmit={(event) => {
								event.preventDefault();
								void updatePost({
									data: {
										slug: post.slug,
										title: post.title,
										publishedAt: post.publishedAt,
										locale: post.locale,
										previewMarkdown: post.previewMarkdown,
									},
								});
							}}
						>
							<Button type="submit" intent="primary" isDisabled={!unsavedChanges}>
								Save
							</Button>
						</form>
					</div>
				</div>
			</Portal>
			<div className="h-[calc(100vh)]">
				<MonacoEditor
					width="100%"
					height="100%"
					defaultLanguage="markdown"
					defaultValue={post.previewMarkdown || post.markdown}
					className=""
					onChange={onChange}
					options={{
						fontSize: 11,
						automaticLayout: true,
						trimAutoWhitespace: true,
						autoClosingQuotes: "always",
						autoClosingBrackets: "always",
						autoClosingOvertype: "always",
						autoIndent: "full",
						autoClosingComments: "always",
						cursorStyle: "line",
						lineNumbers: "off",
						minimap: { enabled: false },
						wordWrap: "on",
					}}
				/>
			</div>
		</>
	);
}
