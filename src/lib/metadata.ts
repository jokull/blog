export type Metadata = {
	title?: string | { template?: string; default?: string };
	description?: string;
	alternates?: unknown;
	openGraph?: unknown;
	twitter?: unknown;
};

export type Viewport = {
	width?: string;
	initialScale?: number;
	maximumScale?: number;
	colorScheme?: string;
	themeColor?: string;
};
