/**
 * The contract factory, shared by every namespace.
 *
 * One factory means one context type across kitty and the blog admin, which is
 * what lets both live in a single router behind a single endpoint — and a
 * single browser client, which the `Register` interface in ./client makes a
 * hard requirement rather than a preference.
 *
 * BROWSER-SAFE: `rpc` is the contract language, not the server runtime.
 */
import { rpc } from "result-rpc";
import type { AppContext } from "./context";

export const app = rpc.context<AppContext>();
