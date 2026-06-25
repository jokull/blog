import { notFound, redirect } from "@tanstack/react-router";

export function throwRedirect(options: Parameters<typeof redirect>[0]): never {
	// eslint-disable-next-line typescript/only-throw-error -- TanStack Router redirects use thrown control-flow objects.
	throw redirect(options);
}

export function throwNotFound(): never {
	// eslint-disable-next-line typescript/only-throw-error -- TanStack Router notFound uses thrown control-flow objects.
	throw notFound();
}
