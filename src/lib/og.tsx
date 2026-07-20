import { ImageResponse } from "takumi-js/response";

const dimensions = { width: 1200, height: 630 };

export function ogImage({
	title,
	description,
	kicker = "Jökull Sólberg",
}: {
	title: string;
	description?: string;
	kicker?: string;
}) {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: 76,
				background: "linear-gradient(135deg, #0d43bc, #155dfc 55%, #73a7ff)",
				color: "white",
				fontFamily: "Geist",
			}}
		>
			<div style={{ display: "flex", fontSize: 30, fontWeight: 650, letterSpacing: -0.5 }}>
				{kicker}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<div style={{ display: "flex", fontSize: 64, fontWeight: 750, lineHeight: 1.1 }}>
					{title}
				</div>
				{description ? (
					<div
						style={{
							display: "flex",
							fontSize: 28,
							color: "#dbeafe",
							lineHeight: 1.35,
						}}
					>
						{description}
					</div>
				) : null}
			</div>
			<div style={{ display: "flex", fontSize: 24, color: "#dbeafe" }}>solberg.is</div>
		</div>,
		dimensions,
	);
}
