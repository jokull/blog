/**
 * Categories: the chip row and the add dialog.
 *
 * Formisch owns the dialog's fields and their validation, so the component
 * holds no field state of its own, and the one failure the server can report
 * (`category/slug-taken`) is a declared tag rather than a string fished out of
 * an exception. Nothing here uses `confirm()` or `alert()`: deleting a category
 * in use is `category/in-use` with the count in its payload, rendered inline.
 */
import { Field, Form, reset, useForm } from "@formisch/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Description, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from "@/components/ui/modal";
import { TextField } from "@/components/ui/text-field";
import { client } from "@/src/rpc/client";
import { CategoryFormSchema, type CategoryForm } from "../schemas";
import { AdminShell } from "../shells";
import type { SavedCategory } from "../models";

interface CategoryManagerProps {
	categories: readonly SavedCategory[];
	postCounts: ReadonlyMap<string | null, number>;
}

export function CategoryManager({ categories, postCounts }: CategoryManagerProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	/**
	 * `.affects(categories.list)` on the contract is what refills the chip row,
	 * so this call site needs no invalidation of its own.
	 */
	const remove = AdminShell.useMutation(client.categories.remove);

	return (
		<div className="mb-8">
			<h2 className="mb-3 font-semibold text-lg">Categories</h2>
			<div className="flex flex-wrap items-center gap-2">
				{categories.map((category) => {
					const count = postCounts.get(category.slug) ?? 0;

					return (
						<div
							key={category.slug}
							className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800"
						>
							<span className="text-sm">
								{category.label} ({count})
							</span>
							{count === 0 && (
								<button
									type="button"
									onClick={() => {
										remove.mutate({ slug: category.slug });
									}}
									disabled={remove.state === "pending"}
									className="text-neutral-400 hover:text-red-600 disabled:opacity-40"
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

			{/*
			 * The chip row hides the delete button at count > 0, so this is the
			 * race: someone assigned a post to this category since the page
			 * loaded. It is a declared outcome with the real count attached, so
			 * the message can name the number of posts blocking the delete.
			 */}
			{remove.state === "failure" && (
				<p className="mt-2 text-danger text-sm">
					{remove.error._tag === "category/in-use"
						? `"${remove.error.data.slug}" still has ${remove.error.data.postCount} post(s).`
						: `"${remove.error.data.slug}" no longer exists.`}
				</p>
			)}

			<AddCategoryDialog
				isOpen={isDialogOpen}
				onClose={() => {
					setIsDialogOpen(false);
				}}
			/>
		</div>
	);
}

function AddCategoryDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
	/**
	 * The same `CategoryFormSchema` that `wire.standard` runs at the boundary,
	 * so the lowercase-hyphen rule is declared once. The form catches it before
	 * a request leaves; the wire catches anything that skips the form.
	 */
	const form = useForm({
		schema: CategoryFormSchema,
		initialInput: { slug: "", label: "" },
	});

	const create = AdminShell.useMutation(client.categories.create, {
		onSuccess: () => {
			reset(form);
			onClose();
		},
	});

	const handleSubmit = (values: CategoryForm) => {
		create.mutate(values);
	};

	return (
		<Modal isOpen={isOpen} onOpenChange={onClose}>
			<ModalContent size="md">
				<ModalHeader>
					<ModalTitle>Add Category</ModalTitle>
				</ModalHeader>

				<Form of={form} onSubmit={handleSubmit}>
					<ModalBody className="space-y-4">
						<Field of={form} path={["slug"]}>
							{(field) => (
								<TextField isInvalid={field.errors !== null}>
									<Label>Slug</Label>
									<Input
										{...field.props}
										value={field.input ?? ""}
										placeholder="tech-reviews"
									/>
									<Description>
										Lowercase letters, numbers and hyphens only
									</Description>
									{field.errors && (
										<span className="mt-1 text-danger text-xs">
											{field.errors[0]}
										</span>
									)}
								</TextField>
							)}
						</Field>

						<Field of={form} path={["label"]}>
							{(field) => (
								<TextField isInvalid={field.errors !== null}>
									<Label>Label</Label>
									<Input
										{...field.props}
										value={field.input ?? ""}
										placeholder="Tech Reviews"
									/>
									{field.errors && (
										<span className="mt-1 text-danger text-xs">
											{field.errors[0]}
										</span>
									)}
								</TextField>
							)}
						</Field>

						{create.state === "failure" && (
							<span className="text-danger text-sm">
								The slug &ldquo;{create.error.data.slug}&rdquo; is already taken.
							</span>
						)}
					</ModalBody>

					<ModalFooter>
						<Button intent="secondary" onPress={onClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							intent="primary"
							isDisabled={create.state === "pending"}
						>
							Create
						</Button>
					</ModalFooter>
				</Form>
			</ModalContent>
		</Modal>
	);
}
