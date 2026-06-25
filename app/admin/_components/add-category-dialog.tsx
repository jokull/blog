"use client";

import { Button } from "@/components/ui/button";
import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalTitle,
} from "@/components/ui/modal";
import { Description, FieldError, Label } from "@/components/ui/field";
import { TextField } from "@/components/ui/text-field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { createCategory } from "../actions";

interface AddCategoryDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AddCategoryDialog({ isOpen, onClose }: AddCategoryDialogProps) {
	const [slug, setSlug] = useState("");
	const [label, setLabel] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		void (async () => {
			try {
				await createCategory({ data: { slug, label } });
				onClose();
				setSlug("");
				setLabel("");
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		})();
	};

	return (
		<Modal isOpen={isOpen} onOpenChange={onClose}>
			<ModalContent size="md">
				<ModalHeader>
					<ModalTitle>Add Category</ModalTitle>
				</ModalHeader>

				<form onSubmit={handleSubmit}>
					<ModalBody className="space-y-4">
						<TextField>
							<Label>Slug</Label>
							<Input
								value={slug}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									setSlug(e.target.value);
								}}
								placeholder="tech-reviews"
								required
							/>
							<Description>Lowercase letters, numbers, and hyphens only</Description>
						</TextField>

						<TextField>
							<Label>Label</Label>
							<Input
								value={label}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									setLabel(e.target.value);
								}}
								placeholder="Tech Reviews"
								required
							/>
						</TextField>

						{error && <FieldError>{error}</FieldError>}
					</ModalBody>

					<ModalFooter>
						<Button intent="secondary" onPress={onClose}>
							Cancel
						</Button>
						<Button type="submit" intent="primary">
							Create
						</Button>
					</ModalFooter>
				</form>
			</ModalContent>
		</Modal>
	);
}
