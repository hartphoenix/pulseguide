const GREEN = "#5fa75f";

export function DrawerToggle({
	count,
	activePlayback,
	open,
	onClick,
}: {
	count: number;
	activePlayback: boolean;
	open: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={open ? "Close recordings drawer" : "Open recordings drawer"}
			style={{
				position: "relative",
				padding: "2px 8px",
				fontSize: 12,
				background: activePlayback ? "#1a2c1a" : "#222",
				color: activePlayback ? "#cfe6cf" : "#aaa",
				border: `1px solid ${activePlayback ? GREEN : "#444"}`,
				borderRadius: 4,
				cursor: "pointer",
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
			}}
		>
			<span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
				🎤
			</span>
			<span style={{ fontSize: 12 }}>Recordings</span>
			{count > 0 && (
				<span
					style={{
						minWidth: 16,
						height: 16,
						padding: "0 4px",
						borderRadius: 8,
						background: activePlayback ? GREEN : "#444",
						color: activePlayback ? "#0a0a0a" : "#ddd",
						fontSize: 10,
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{count}
				</span>
			)}
		</button>
	);
}
