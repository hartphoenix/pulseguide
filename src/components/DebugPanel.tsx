import type { SyncState } from "../sync/engine";
import type { PulseMap } from "../types/pulsemap";

function formatMs(ms: number): string {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const sec = s % 60;
	const frac = Math.floor((ms % 1000) / 10);
	return `${m}:${String(sec).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}

function MapSummary({ map }: { map: PulseMap }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<strong>Map loaded:</strong> {map.metadata?.title ?? map.id}
			{map.metadata?.artist && ` — ${map.metadata.artist}`}
			<br />
			<strong>Duration:</strong> {formatMs(map.duration_ms)} | <strong>Version:</strong>{" "}
			{map.version} | <strong>ID:</strong> {map.id}
			<br />
			<strong>Fields:</strong>{" "}
			{[
				map.lyrics && `${map.lyrics.length} lyrics`,
				map.chords && `${map.chords.length} chords`,
				map.beats && `${map.beats.length} beats`,
				map.sections && `${map.sections.length} sections`,
				map.fingerprint && "fingerprint",
				map.midi && `${map.midi.length} midi`,
			]
				.filter(Boolean)
				.join(", ") || "none"}
		</div>
	);
}

export function DebugPanel({ map, sync }: { map: PulseMap | null; sync: SyncState | null }) {
	if (!map) return <div style={{ padding: 8, color: "#888" }}>No map loaded.</div>;

	return (
		<div
			style={{
				padding: 12,
				fontFamily: "monospace",
				fontSize: 13,
				lineHeight: 1.6,
				background: "#111",
				color: "#ddd",
				borderRadius: 4,
				overflow: "auto",
			}}
		>
			<MapSummary map={map} />
			{sync && (
				<div>
					<strong>Position:</strong> {formatMs(sync.position)} |{" "}
					<strong>{sync.playing ? "PLAYING" : "PAUSED"}</strong> | <strong>Rate:</strong>{" "}
					{sync.rate}x
					{sync.bpm != null && (
						<>
							{" "}
							| <strong>BPM:</strong> {sync.bpm}
						</>
					)}
					{sync.timeSig && (
						<>
							{" "}
							| <strong>Time:</strong> {sync.timeSig}
						</>
					)}
					<br />
					<strong>Section:</strong>{" "}
					{sync.currentSection
						? `${sync.currentSection.type}${sync.currentSection.label ? ` (${sync.currentSection.label})` : ""}`
						: "—"}
					<br />
					<strong>Lyric:</strong> {sync.currentLyric?.text ?? "—"}
					<br />
					<strong>Chord:</strong> {sync.currentChord?.chord ?? "—"}
				</div>
			)}
		</div>
	);
}
