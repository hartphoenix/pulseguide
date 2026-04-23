import { useEffect, useRef } from "react";
import type { LyricLine } from "../types/pulsemap";

const SCROLL_TARGET_RATIO = 0.15;

export function LyricsDisplay({
	lyrics,
	activeTimestamp,
	onSeek,
}: {
	lyrics: LyricLine[];
	activeTimestamp: number | null;
	onSeek: (ms: number) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const activeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!activeRef.current || !containerRef.current) return;

		const container = containerRef.current;
		const active = activeRef.current;
		const containerRect = container.getBoundingClientRect();
		const activeRect = active.getBoundingClientRect();

		const targetOffset = containerRect.height * SCROLL_TARGET_RATIO;
		const activeRelativeTop = activeRect.top - containerRect.top + container.scrollTop;
		const targetScroll = activeRelativeTop - targetOffset;

		const maxScroll = container.scrollHeight - container.clientHeight;
		const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll));

		container.scrollTo({ top: clampedScroll, behavior: "smooth" });
	}, [activeTimestamp]);

	if (!lyrics.length) {
		return <div style={{ padding: 16, color: "#888" }}>No lyrics in this map.</div>;
	}

	return (
		<div
			ref={containerRef}
			style={{
				flex: 1,
				overflow: "auto",
				padding: "24px 20px",
				scrollBehavior: "smooth",
				WebkitOverflowScrolling: "touch",
			}}
		>
			<div style={{ maxWidth: 600, margin: "0 auto" }}>
				{lyrics.map((line) => {
					const isActive = line.t === activeTimestamp;
					return (
						<button
							type="button"
							key={line.t}
							ref={isActive ? activeRef : undefined}
							onClick={() => onSeek(line.t)}
							style={{
								display: "block",
								width: "100%",
								textAlign: "left",
								padding: "10px 8px",
								fontSize: 20,
								lineHeight: 1.5,
								cursor: "pointer",
								color: isActive ? "#fff" : "#999",
								fontWeight: isActive ? 600 : 400,
								transition: "color 0.15s, font-weight 0.15s",
								borderRadius: 4,
								background: "none",
								border: "none",
								fontFamily: "inherit",
							}}
						>
							{line.text}
						</button>
					);
				})}
			</div>
		</div>
	);
}
