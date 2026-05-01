import type { YouTubeEmbedAdapter } from "pulsemap/sdk";
import { type CSSProperties, useState } from "react";

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export type RecordState = "idle" | "arming" | "recording";

const Chevron = ({ dir, double }: { dir: "left" | "right"; double?: boolean }) => {
	const single = dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6";
	const dbl = dir === "left" ? "M11 18l-6-6 6-6 M19 18l-6-6 6-6" : "M5 6l6 6-6 6 M13 6l6 6-6 6";
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d={double ? dbl : single} />
		</svg>
	);
};

const PlayIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path d="M8 5v14l11-7z" />
	</svg>
);

const PauseIcon = () => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<rect x="6" y="5" width="4" height="14" />
		<rect x="14" y="5" width="4" height="14" />
	</svg>
);

const RecordDotIcon = () => (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<circle cx="12" cy="12" r="7" />
	</svg>
);

const StopSquareIcon = () => (
	<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<rect x="5" y="5" width="14" height="14" rx="1.5" />
	</svg>
);

const Speaker = ({ muted }: { muted: boolean }) => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path d="M11 5L6 9H3v6h3l5 4z" />
		{!muted && (
			<>
				<path
					d="M14.5 8.5a4 4 0 010 7"
					stroke="currentColor"
					strokeWidth={1.5}
					fill="none"
					strokeLinecap="round"
				/>
				<path
					d="M16.5 6a7 7 0 010 12"
					stroke="currentColor"
					strokeWidth={1.5}
					fill="none"
					strokeLinecap="round"
				/>
			</>
		)}
		{muted && (
			<line
				x1="3"
				y1="3"
				x2="21"
				y2="21"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
			/>
		)}
	</svg>
);

const seekBtnStyle = (dim: boolean): CSSProperties => ({
	width: 30,
	height: 30,
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	background: "var(--bg-surface)",
	color: "var(--text)",
	border: "1px solid var(--border)",
	borderRadius: 15,
	cursor: dim ? "default" : "pointer",
	opacity: dim ? 0.4 : 1,
	pointerEvents: dim ? "none" : "auto",
	transition: "background 0.15s, color 0.15s",
});

const playBtnStyle = (dim: boolean): CSSProperties => ({
	width: 40,
	height: 40,
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	background: "var(--accent)",
	color: "var(--bg-deep)",
	border: "none",
	borderRadius: "50%",
	cursor: dim ? "default" : "pointer",
	opacity: dim ? 0.4 : 1,
	pointerEvents: dim ? "none" : "auto",
	boxShadow: "0 0 12px var(--accent-glow)",
});

const recordBtnStyle = (recording: boolean, arming: boolean): CSSProperties => ({
	width: 40,
	height: 40,
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	background: recording ? "var(--record)" : "var(--bg-surface)",
	color: recording ? "var(--text-h)" : "var(--record)",
	border: recording ? "1px solid var(--record)" : "1px solid var(--record)",
	borderRadius: "50%",
	cursor: arming ? "default" : "pointer",
	opacity: arming ? 0.6 : 1,
	boxShadow: recording ? "0 0 14px var(--record-glow)" : "none",
	transition: "background 0.15s, box-shadow 0.15s",
});

const divider: CSSProperties = {
	width: 1,
	height: 20,
	background: "var(--border)",
	flexShrink: 0,
};

const selectStyle = (dim: boolean): CSSProperties => ({
	padding: "4px 8px",
	background: "var(--bg-surface)",
	color: "var(--text-h)",
	border: "1px solid var(--border)",
	borderRadius: 6,
	fontSize: 13,
	fontFamily: "var(--sans)",
	cursor: dim ? "default" : "pointer",
	opacity: dim ? 0.4 : 1,
	pointerEvents: dim ? "none" : "auto",
});

const muteBtnStyle = (muted: boolean): CSSProperties => ({
	width: 28,
	height: 28,
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	background: "transparent",
	color: muted ? "var(--text-muted)" : "var(--text)",
	border: "none",
	cursor: "pointer",
	padding: 0,
});

export function PlaybackControls({
	adapter,
	playing,
	rate,
	recording,
	recordingPlayback,
	recordState,
	recordError,
	onRecordClick,
}: {
	adapter: YouTubeEmbedAdapter | null;
	playing: boolean;
	rate: number;
	recording: boolean;
	recordingPlayback: boolean;
	recordState: RecordState;
	recordError: string | null;
	onRecordClick: () => void;
}) {
	const [muted, setMuted] = useState(false);
	if (!adapter) return null;

	const dimSeekPlay = recording;
	const dimSpeed = recording || recordingPlayback;
	const arming = recordState === "arming";

	function toggleMute() {
		if (!adapter) return;
		const next = !adapter.isMuted();
		adapter.setMuted(next);
		setMuted(next);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 4,
				padding: "6px 0",
			}}
		>
			<div
				style={{
					display: "flex",
					gap: 8,
					alignItems: "center",
					flexWrap: "wrap",
					justifyContent: "center",
				}}
			>
				<button
					type="button"
					aria-label="Back 10 seconds"
					style={seekBtnStyle(dimSeekPlay)}
					onClick={() => adapter.seek(Math.max(0, adapter.getPosition() - 10000))}
				>
					<Chevron dir="left" double />
				</button>
				<button
					type="button"
					aria-label="Back 5 seconds"
					style={seekBtnStyle(dimSeekPlay)}
					onClick={() => adapter.seek(Math.max(0, adapter.getPosition() - 5000))}
				>
					<Chevron dir="left" />
				</button>
				<button
					type="button"
					aria-label={playing ? "Pause" : "Play"}
					style={playBtnStyle(dimSeekPlay)}
					onClick={() => (playing ? adapter.pause() : adapter.play())}
				>
					{playing ? <PauseIcon /> : <PlayIcon />}
				</button>
				<button
					type="button"
					aria-label="Forward 5 seconds"
					style={seekBtnStyle(dimSeekPlay)}
					onClick={() => adapter.seek(adapter.getPosition() + 5000)}
				>
					<Chevron dir="right" />
				</button>
				<button
					type="button"
					aria-label="Forward 10 seconds"
					style={seekBtnStyle(dimSeekPlay)}
					onClick={() => adapter.seek(adapter.getPosition() + 10000)}
				>
					<Chevron dir="right" double />
				</button>

				<span style={divider} />

				<select
					aria-label="Playback speed"
					value={rate}
					onChange={(e) => adapter.setPlaybackRate(Number(e.target.value))}
					style={selectStyle(dimSpeed)}
				>
					{RATES.map((r) => (
						<option key={r} value={r}>
							{r}x
						</option>
					))}
				</select>

				<span style={divider} />

				<button
					type="button"
					aria-label={muted ? "Unmute" : "Mute"}
					onClick={toggleMute}
					style={muteBtnStyle(muted)}
				>
					<Speaker muted={muted} />
				</button>
				<input
					aria-label="Volume"
					type="range"
					min={0}
					max={1}
					step={0.05}
					defaultValue={1}
					onChange={(e) => adapter.setVolume(Number(e.target.value))}
					style={{ width: 80, accentColor: "var(--accent)" }}
				/>

				<span style={divider} />

				<button
					type="button"
					aria-label={recording ? "Stop recording" : "Start recording"}
					style={recordBtnStyle(recording, arming)}
					onClick={onRecordClick}
					disabled={arming}
				>
					{recording ? <StopSquareIcon /> : <RecordDotIcon />}
				</button>
			</div>
			{recordError && <span style={{ fontSize: 11, color: "var(--record)" }}>{recordError}</span>}
		</div>
	);
}
