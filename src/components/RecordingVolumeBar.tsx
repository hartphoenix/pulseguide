import { useEffect, useRef } from "react";

const RED = "#d04545";

export function RecordingVolumeBar({
	active,
	getAmplitude,
}: {
	active: boolean;
	getAmplitude: () => number;
}) {
	const innerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!active) return;
		let frame = 0;
		let smoothed = 0;
		const loop = () => {
			const amp = getAmplitude();
			smoothed = smoothed * 0.7 + amp * 0.3;
			const scale = Math.min(1, smoothed * 6);
			if (innerRef.current) {
				innerRef.current.style.transform = `scaleX(${scale})`;
			}
			frame = requestAnimationFrame(loop);
		};
		frame = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(frame);
	}, [active, getAmplitude]);

	if (!active) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				height: 4,
				pointerEvents: "none",
				zIndex: 9999,
				background: "rgba(208, 69, 69, 0.15)",
			}}
		>
			<div
				ref={innerRef}
				style={{
					height: "100%",
					width: "100%",
					background: RED,
					transformOrigin: "center",
					transform: "scaleX(0)",
					transition: "transform 60ms linear",
				}}
			/>
		</div>
	);
}
