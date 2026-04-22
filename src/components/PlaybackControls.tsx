import type { YouTubeEmbedAdapter } from "pulsemap/sdk";

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlaybackControls({
	adapter,
	playing,
	rate,
}: {
	adapter: YouTubeEmbedAdapter | null;
	playing: boolean;
	rate: number;
}) {
	if (!adapter) return null;

	return (
		<div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
			<button
				type="button"
				onClick={() => adapter.seek(Math.max(0, adapter.getPosition() - 10000))}
			>
				-10s
			</button>
			<button type="button" onClick={() => adapter.seek(Math.max(0, adapter.getPosition() - 5000))}>
				-5s
			</button>
			<button type="button" onClick={() => (playing ? adapter.pause() : adapter.play())}>
				{playing ? "Pause" : "Play"}
			</button>
			<button type="button" onClick={() => adapter.seek(adapter.getPosition() + 5000)}>
				+5s
			</button>
			<button type="button" onClick={() => adapter.seek(adapter.getPosition() + 10000)}>
				+10s
			</button>
			<span style={{ margin: "0 4px", color: "#888" }}>|</span>
			<label htmlFor="rate-select" style={{ fontSize: 13 }}>
				Speed:
			</label>
			<select
				id="rate-select"
				value={rate}
				onChange={(e) => adapter.setPlaybackRate(Number(e.target.value))}
				style={{ padding: 2 }}
			>
				{RATES.map((r) => (
					<option key={r} value={r}>
						{r}x
					</option>
				))}
			</select>
			<span style={{ margin: "0 4px", color: "#888" }}>|</span>
			<label htmlFor="volume-range" style={{ fontSize: 13 }}>
				Vol:
			</label>
			<input
				id="volume-range"
				type="range"
				min={0}
				max={1}
				step={0.05}
				defaultValue={1}
				onChange={(e) => adapter.setVolume(Number(e.target.value))}
				style={{ width: 80 }}
			/>
			<button
				type="button"
				onClick={() => adapter.setMuted(!adapter.isMuted())}
				style={{ fontSize: 13 }}
			>
				{adapter.isMuted() ? "Unmute" : "Mute"}
			</button>
		</div>
	);
}
