"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddCategoryDialog } from "./add-category-dialog";
import { deleteCategory } from "../actions";

interface CategoryManagerProps {
	categories: Array<{ slug: string; label: string }>;
	postCounts: Map<string | null, number>;
}

export function CategoryManager({ categories, postCounts }: CategoryManagerProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleDelete = async (slug: string) => {
		if (!confirm(`Delete category "${slug}"?`)) return;
		try {
			await deleteCategory({ data: { slug } });
		} catch (error) {
			alert(error instanceof Error ? error.message : String(error));
		}
	};

	return (
		<div className="mb-8">
			<h2 className="mb-3 font-semibold text-lg">Categories</h2>
			<div className="flex flex-wrap items-center gap-2">
				{categories.map((category) => {
					const count = postCounts.get(category.slug) ?? 0;
					const canDelete = count === 0;

					return (
						<div
							key={category.slug}
							className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
						>
							<span className="text-sm">
								{category.label} ({count})
							</span>
							{canDelete && (
								<button
									type="button"
									onClick={() => {
										void handleDelete(category.slug);
									}}
									className="text-neutral-400 hover:text-red-600"
									aria-label={`Delete ${category.label}`}
								>
									<svg
										className="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							)}
						</div>
					);
				})}

				<Button
					intent="plain"
					onPress={() => {
						setIsDialogOpen(true);
					}}
				>
					+ Add Category
				</Button>
			</div>

			<AddCategoryDialog
				isOpen={isDialogOpen}
				onClose={() => {
					setIsDialogOpen(false);
				}}
			/>
		</div>
	);
}
