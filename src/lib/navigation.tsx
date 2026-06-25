import { useLocation, useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
	href: string;
	prefetch?: unknown;
	replace?: boolean;
	scroll?: boolean;
};

export function Link({
	children,
	href,
	prefetch: _prefetch,
	replace: _replace,
	scroll: _scroll,
	...props
}: LinkProps) {
	return (
		<a href={href} {...props}>
			{children}
		</a>
	);
}

export type StaticImageData = {
	src: string;
	width?: number;
	height?: number;
	blurDataURL?: string;
};

type ImageLikeSrc = string | StaticImageData;

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
	src: ImageLikeSrc;
	quality?: number;
	placeholder?: string;
	priority?: boolean;
};

export function Image({
	alt = "",
	src,
	quality: _quality,
	placeholder: _placeholder,
	priority: _priority,
	...props
}: ImageProps) {
	const resolvedSrc = typeof src === "string" ? src : src.src;
	return <img alt={alt} src={resolvedSrc} {...props} />;
}

export function usePathname() {
	return useLocation({
		select: (location) => location.pathname,
	});
}

export function useSearchParams() {
	const search = useLocation({
		select: (location) => location.searchStr,
	});
	return new URLSearchParams(search);
}

export function useNextRouter() {
	const router = useRouter();
	return {
		push: (href: string) => router.navigate({ to: href }),
		replace: (href: string, options?: { scroll?: boolean }) =>
			router.navigate({
				to: href,
				replace: true,
				resetScroll: options?.scroll !== false,
			}),
		refresh: () => router.invalidate(),
	};
}
