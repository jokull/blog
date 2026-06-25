import type { InferSelectModel } from "drizzle-orm";
import { type ReactNode, useState } from "react";
import { Modal, ModalOverlay } from "react-aria-components";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Post } from "@/schema";
import { previewPost } from "../server";

export function Preview({
	children,
	post,
}: {
	children: ReactNode;
	post: Pick<InferSelectModel<typeof Post>, "slug" | "previewMarkdown">;
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<form
				className="contents"
				onSubmit={(event) => {
					event.preventDefault();
					void previewPost({
						data: { slug: post.slug, previewMarkdown: post.previewMarkdown },
					});
				}}
			>
				<Button
					className="w-full"
					type="submit"
					onPress={() => {
						setIsOpen(true);
					}}
				>
					Open Preview
				</Button>
			</form>
			<ModalOverlay isOpen={isOpen} onOpenChange={setIsOpen} isDismissable>
				<Modal>
					<Dialog>
						<DialogHeader>
							<DialogTitle>Preview</DialogTitle>
						</DialogHeader>
						<DialogBody>{children}</DialogBody>
						<DialogFooter>
							<Button
								onPress={() => {
									setIsOpen(false);
								}}
							>
								Close
							</Button>
						</DialogFooter>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</>
	);
}
