/**
 * The kitty tree's handle on the app-wide shell onion.
 *
 * Nothing about the session or the sign-in reaction is kitty-specific, so the
 * shells are defined once in src/rpc/shells.ts and the blog admin mounts the
 * same ones. This re-export is only a local handle on them.
 */
export {
	BoundaryProvider,
	DefectShell,
	SessionShell,
	SignInShell,
	StaleShell,
	TransportShell,
	signIn,
	useConnectivity,
} from "@/src/rpc/shells";
