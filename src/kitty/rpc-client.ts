/**
 * The kitty components' handle on the app-wide client.
 *
 * There is one client for the whole app (see src/rpc/client.ts — result-rpc
 * registers it globally, so there can only be one). This re-export lets kitty
 * call sites read `import { client } from "../rpc-client"` and keeps the
 * client-boundary warning attached to the module they actually import.
 *
 * Never re-export anything from src/rpc/server here.
 */
export { client } from "@/src/rpc/client";
export type { AppClient } from "@/src/rpc/client";
