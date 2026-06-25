import { Link } from "@/src/lib/navigation";

export default function KittyNotFound() {
	return (
		<div className="flex-1 flex items-center justify-center">
			<div className="text-center p-8 max-w-md">
				<h1 className="text-2xl font-bold mb-2">Theme Not Found</h1>
				<p className="text-muted-fg mb-6">
					The theme you&apos;re looking for doesn&apos;t exist or has been deleted.
				</p>
				<Link
					href="/kitty"
					className="inline-block px-6 py-3 bg-primary text-primary-fg rounded-lg font-semibold hover:bg-primary/90 transition-colors"
				>
					Browse Themes
				</Link>
			</div>
		</div>
	);
}
