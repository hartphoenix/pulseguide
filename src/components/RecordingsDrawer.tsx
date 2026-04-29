import { useEffect, useRef, useState } from "react";
import { formatRecordingLabel } from "../recording/format";
import type { Journey } from "../types/journey";

const GREEN = "#5fa75f";
const GREEN_BG = "#1a2c1a";

export function RecordingsDrawer({
	open,
	journeys,
	activeId,
	recordingVolume,
	onSetRecordingVolume,
	onToggleActive,
	onDelete,
	onNudge,
	onResetNudge,
	onClose,
}: {
	open: boolean;
	journeys: Journey[];
	activeId: string | null;
	recordingVolume: number;
	onSetRecordingVolume: (v: number) => void;
	onToggleActive: (id: string) => void;
	onDelete: (id: string) => void;
	onNudge: (id: string, deltaMs: number) => void;
	onResetNudge: (id: string) => void;
	onClose: () => void;
}) {
	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	return (
		<>
			<div
				onClick={onClose}
				aria-hidden="true"
				style={{
					position: "absolute",
					inset: 0,
					background: "rgba(0, 0, 0, 0.45)",
					opacity: open ? 1 : 0,
					pointerEvents: open ? "auto" : "none",
					transition: "opacity 200ms ease",
					zIndex: 49,
				}}
			/>
			<aside
				style={{
					position: "absolute",
					top: 0,
					right: 0,
					bottom: 0,
					width: 320,
					background: "#141414",
					borderLeft: "1px solid #2a2a2a",
					transform: open ? "translateX(0)" : "translateX(100%)",
					transition: "transform 200ms ease",
					display: "flex",
					flexDirection: "column",
					zIndex: 50,
					boxShadow: open ? "-4px 0 12px rgba(0,0,0,0.4)" : "none",
				}}
			>
				<div
					style={{
						padding: "8px 12px",
						borderBottom: "1px solid #2a2a2a",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 8,
					}}
				>
					<span style={{ fontSize: 13, color: "#aaa" }}>Recordings</span>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close recordings drawer"
						style={{
							padding: "2px 8px",
							fontSize: 12,
							background: "transparent",
							color: "#aaa",
							border: "1px solid #444",
							borderRadius: 4,
							cursor: "pointer",
						}}
					>
						Close
					</button>
				</div>

				<div style={{ flex: 1, overflowY: "auto" }}>
					{journeys.length === 0 ? (
						<div
							style={{
								padding: 16,
								color: "#666",
								fontSize: 13,
								textAlign: "center",
							}}
						>
							No recordings yet.
						</div>
					) : (
						journeys.map((j) => (
							<RecordingRow
								key={j.id}
								journey={j}
								active={j.id === activeId}
								recordingVolume={recordingVolume}
								onSetRecordingVolume={onSetRecordingVolume}
								onToggleActive={() => onToggleActive(j.id)}
								onDelete={() => onDelete(j.id)}
								onNudge={(d) => onNudge(j.id, d)}
								onResetNudge={() => onResetNudge(j.id)}
							/>
						))
					)}
				</div>
			</aside>
		</>
	);
}

function RecordingRow({
	journey,
	active,
	recordingVolume,
	onSetRecordingVolume,
	onToggleActive,
	onDelete,
	onNudge,
	onResetNudge,
}: {
	journey: Journey;
	active: boolean;
	recordingVolume: number;
	onSetRecordingVolume: (v: number) => void;
	onToggleActive: () => void;
	onDelete: () => void;
	onNudge: (deltaMs: number) => void;
	onResetNudge: () => void;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (confirmTimer.current) clearTimeout(confirmTimer.current);
		};
	}, []);

	function clearConfirmTimer() {
		if (confirmTimer.current) {
			clearTimeout(confirmTimer.current);
			confirmTimer.current = null;
		}
	}

	function handleTrashClick(e: React.MouseEvent) {
		e.stopPropagation();
		if (confirmDelete) {
			clearConfirmTimer();
			onDelete();
			return;
		}
		setConfirmDelete(true);
		confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
	}

	function handleRowClick() {
		if (confirmDelete) {
			clearConfirmTimer();
			setConfirmDelete(false);
			return;
		}
		onToggleActive();
	}

	const created = new Date(journey.created_at);
	const label = formatRecordingLabel(journey.duration_ms, created);
	const offsetSign = journey.playback_offset_ms > 0 ? "+" : "";
	const offsetText = `${offsetSign}${journey.playback_offset_ms} ms`;

	return (
		<div
			onClick={handleRowClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleRowClick();
				}
			}}
			role="button"
			tabIndex={0}
			style={{
				padding: "8px 12px",
				borderBottom: "1px solid #2a2a2a",
				background: active ? GREEN_BG : "transparent",
				cursor: "pointer",
				color: active ? "#cfe6cf" : "#ddd",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
				}}
			>
				<span
					style={{
						flex: 1,
						fontSize: 13,
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{label}
				</span>
				<button
					type="button"
					onClick={handleTrashClick}
					style={{
						padding: "2px 6px",
						fontSize: 11,
						background: confirmDelete ? "#3a1414" : "transparent",
						color: confirmDelete ? "#ffb0b0" : "#888",
						border: `1px solid ${confirmDelete ? "#d04545" : "#444"}`,
						borderRadius: 4,
						cursor: "pointer",
					}}
				>
					{confirmDelete ? "Confirm?" : "🗑"}
				</button>
			</div>

			{active && (
				<div
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					style={{
						marginTop: 8,
						display: "flex",
						flexDirection: "column",
						gap: 6,
					}}
					role="group"
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							fontSize: 11,
						}}
					>
						<NudgeBtn label="−100" onClick={() => onNudge(-100)} />
						<NudgeBtn label="−10" onClick={() => onNudge(-10)} />
						<span
							style={{
								flex: 1,
								textAlign: "center",
								fontVariantNumeric: "tabular-nums",
								color: "#cfe6cf",
							}}
						>
							{offsetText}
						</span>
						<NudgeBtn label="+10" onClick={() => onNudge(10)} />
						<NudgeBtn label="+100" onClick={() => onNudge(100)} />
						<button
							type="button"
							onClick={onResetNudge}
							title="Reset offset to zero"
							style={{
								padding: "1px 6px",
								fontSize: 10,
								background: "transparent",
								color: "#888",
								border: "1px solid #444",
								borderRadius: 4,
								cursor: "pointer",
							}}
						>
							reset
						</button>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							fontSize: 11,
							color: "#aaa",
						}}
					>
						<label htmlFor={`recvol-${journey.id}`}>Rec vol</label>
						<input
							id={`recvol-${journey.id}`}
							type="range"
							min={0}
							max={1}
							step={0.05}
							value={recordingVolume}
							onChange={(e) => onSetRecordingVolume(Number(e.target.value))}
							style={{ flex: 1 }}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function NudgeBtn({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				padding: "1px 6px",
				fontSize: 11,
				background: "#222",
				color: "#ddd",
				border: "1px solid #444",
				borderRadius: 4,
				cursor: "pointer",
				fontVariantNumeric: "tabular-nums",
			}}
		>
			{label}
		</button>
	);
}
