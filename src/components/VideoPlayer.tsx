import { useCallback, useRef, useState } from "react";

export type VideoMode = "expanded" | "minimized";

export function VideoPlayer({
	mode,
	onToggleMode,
	videoTitle,
	playing,
	landscape,
}: {
	mode: VideoMode;
	onToggleMode: () => void;
	videoTitle: string | null;
	playing: boolean;
	landscape: boolean;
}) {
	const [size, setSize] = useState({ width: 400, height: 225 });
	const dragging = useRef(false);
	const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

	const onPointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			dragging.current = true;
			startPos.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
		},
		[size],
	);

	const onPointerMove = useCallback((e: React.PointerEvent) => {
		if (!dragging.current) return;
		const dx = e.clientX - startPos.current.x;
		const dy = e.clientY - startPos.current.y;
		setSize({
			width: Math.max(200, startPos.current.w + dx),
			height: Math.max(112, startPos.current.h + dy),
		});
	}, []);

	const onPointerUp = useCallback(() => {
		dragging.current = false;
	}, []);

	const minimized = mode === "minimized";

	return (
		<div>
			{minimized && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						padding: "8px 12px",
						background: "#1a1a1a",
						borderRadius: 8,
						minWidth: 0,
					}}
				>
					<div
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							background: playing ? "#4f4" : "#888",
							flexShrink: 0,
						}}
					/>
					<div
						style={{
							fontSize: 14,
							color: "#ddd",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							flex: 1,
							minWidth: 0,
						}}
					>
						{videoTitle ?? "No video loaded"}
					</div>
					<button
						type="button"
						onClick={onToggleMode}
						style={{
							padding: "4px 10px",
							fontSize: 12,
							background: "#333",
							color: "#ccc",
							border: "1px solid #555",
							borderRadius: 4,
							cursor: "pointer",
							flexShrink: 0,
						}}
					>
						Show video
					</button>
				</div>
			)}

			<div
				style={{
					position: minimized ? "absolute" : "relative",
					left: minimized ? -9999 : undefined,
					width: !minimized && landscape ? size.width : "100%",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						position: "relative",
						width: "100%",
						height: !minimized && landscape ? size.height : 0,
						paddingBottom: !minimized && landscape ? 0 : minimized ? 0 : "56.25%",
						background: "#000",
						borderRadius: 4,
						overflow: "hidden",
					}}
				>
					<div
						id="yt-player"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
						}}
					/>
				</div>
				{!minimized && (
					<>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginTop: 4,
							}}
						>
							<button
								type="button"
								onClick={onToggleMode}
								style={{
									padding: "2px 8px",
									fontSize: 12,
									background: "#222",
									color: "#aaa",
									border: "1px solid #444",
									borderRadius: 4,
									cursor: "pointer",
								}}
							>
								Hide video
							</button>
						</div>
						{landscape && (
							<div
								onPointerDown={onPointerDown}
								onPointerMove={onPointerMove}
								onPointerUp={onPointerUp}
								style={{
									position: "absolute",
									bottom: 0,
									right: 0,
									width: 16,
									height: 16,
									cursor: "nwse-resize",
									background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)",
									borderRadius: "0 0 4px 0",
								}}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}
