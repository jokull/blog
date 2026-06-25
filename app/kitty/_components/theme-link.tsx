"use client";

import { Link } from "@/src/lib/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useKittyContext } from "../_context/kitty-context";

interface ThemeLinkProps extends ComponentProps<typeof Link> {
	children: React.ReactNode;
}

/**
 * Link wrapper that shows a confirmation dialog if there are unsaved changes.
 */
export function ThemeLink({ children, onClick, ...props }: ThemeLinkProps) {
	const { hasUnsavedChanges, setHasUnsavedChanges } = useKittyContext();

	const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (hasUnsavedChanges) {
			if (!confirm("You have unsaved changes. Are you sure you want to leave?")) {
				e.preventDefault();
				return;
			}
			// Clear unsaved changes flag since user confirmed navigation
			setHasUnsavedChanges(false);
		}

		// Call original onClick if provided
		onClick?.(e);
	};

	return (
		<Link {...props} onClick={handleClick}>
			{children}
		</Link>
	);
}
