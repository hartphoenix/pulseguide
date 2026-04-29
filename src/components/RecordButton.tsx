const RED = "#d04545";

export type RecordState = "idle" | "arming" | "recording";

export function RecordButton({
	state,
	error,
	onClick,
}: {
	state: RecordState;
	error: string | null;
	onClick: () => void;
}) {
	const recording = state === "recording";
	const arming = state === "arming";
	const label = recording ? "Stop" : arming ? "Arming…" : "Record";

	return (
		<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
			<button
				type="button"
				onClick={onClick}
				disabled={arming}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					padding: "2px 10px",
					fontSize: 13,
					background: recording ? "#2a1414" : "#222",
					color: recording ? "#ffd0d0" : "#ddd",
					border: `1px solid ${recording ? RED : "#444"}`,
					borderRadius: 4,
					cursor: arming ? "default" : "pointer",
					opacity: arming ? 0.6 : 1,
				}}
			>
				{recording && (
					<span
						aria-hidden
						style={{
							display: "inline-block",
							width: 8,
							height: 8,
							borderRadius: "50%",
							background: RED,
						}}
					/>
				)}
				{label}
			</button>
			{error && <span style={{ fontSize: 11, color: RED }}>{error}</span>}
		</div>
	);
}
