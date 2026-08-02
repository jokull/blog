/**
 * What `auth/forbidden` looks like.
 *
 * AdminShell claims the tag, so no admin component below can even branch on it
 * — the tag is subtracted from every union they see. It is held here instead,
 * once, and rendered. `resume()` retries everything the shell is holding, which
 * is the right affordance for the only way out of this state: sign in as
 * someone else in another tab, then come back.
 */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SessionShell, signIn } from "@/src/rpc/shells";
import { AdminShell } from "../shells";

export function AdminGate({ children }: { children: ReactNode }) {
	const held = AdminShell.useHeld();
	const viewer = SessionShell.use();

	if (held.affected === 0) return children;

	return (
		<div className="container mx-auto max-w-lg px-4 py-24 text-center">
			<h1 className="mb-2 font-bold text-2xl">Not your dashboard</h1>
			<p className="mb-6 text-muted-fg">
				{viewer
					? `You are signed in as ${viewer.username}, which is not the admin account.`
					: "This screen is for the admin account."}
			</p>
			<div className="flex justify-center gap-2">
				<Button
					intent="secondary"
					onPress={() => {
						held.resume();
					}}
				>
					Try again
				</Button>
				<Button
					intent="primary"
					onPress={() => {
						signIn();
					}}
				>
					Sign in as someone else
				</Button>
			</div>
		</div>
	);
}
