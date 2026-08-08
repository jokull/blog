/**
 * `$EDITOR` integration.
 *
 * A post's body is a markdown file, and the best editor for a markdown file is
 * the one already configured. Editing through `$EDITOR` also needs no draft
 * mechanism — no autosave column, no preview modal — because the buffer is on
 * disk until the editor exits.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineErrors, err, ok, wire, type Result } from "result-rpc";

export const editorErrors = defineErrors("editor", {
	/** No `$VISUAL`, no `$EDITOR`, and no `vi` on PATH. */
	notConfigured: { visibility: "private" },
	/** The editor exited non-zero — treated as "abandon", not "save". */
	aborted: {
		data: wire.object({ command: wire.string, code: wire.number }),
		visibility: "private",
	},
	failed: {
		data: wire.object({ command: wire.string, reason: wire.string }),
		visibility: "private",
	},
});

export type EditorError = ReturnType<(typeof editorErrors)[keyof typeof editorErrors]>;

/** `$VISUAL` wins over `$EDITOR`, which is the convention every other tool follows. */
function resolveEditor(): string | null {
	return process.env.VISUAL ?? process.env.EDITOR ?? null;
}

/**
 * Opens `content` in the user's editor and returns whatever they saved.
 *
 * The file keeps a `.md` extension and the post's slug in its name so syntax
 * highlighting, spell-check and the editor's own filetype hooks all behave the
 * way they would on a real post.
 */
export async function editInEditor(
	name: string,
	content: string,
): Promise<Result<string, EditorError>> {
	const command = resolveEditor();
	if (command === null) return err(editorErrors.notConfigured());

	const path = join(mkdtempSync(join(tmpdir(), "blog-")), `${name}.md`);
	writeFileSync(path, content, "utf-8");

	const exit = await new Promise<Result<number, EditorError>>((resolve) => {
		// `shell: true` so `EDITOR="code -w"` and `EDITOR="subl --wait"` work —
		// people put flags in that variable and a bare execvp would break them.
		// stdio is inherited because a terminal editor needs the real tty.
		const child = spawn(command, [path], { stdio: "inherit", shell: true });
		child.on("error", (cause: Error) => {
			resolve(err(editorErrors.failed({ command, reason: cause.message })));
		});
		child.on("close", (code) => {
			resolve(ok(code ?? 0));
		});
	});

	if (exit.isErr()) return exit;
	// A non-zero exit is how `vi`'s `:cq` and most editors say "discard this".
	if (exit.value !== 0) return err(editorErrors.aborted({ command, code: exit.value }));

	return ok(readFileSync(path, "utf-8"));
}
