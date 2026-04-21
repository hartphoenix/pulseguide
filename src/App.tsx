import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseYouTubeVideoId, YouTubeEmbedAdapter } from "./adapters/youtube-embed";
import { DebugPanel } from "./components/DebugPanel";
import { MapLoader } from "./components/MapLoader";
import type { SyncState } from "./sync/engine";
import { SyncEngine } from "./sync/engine";
import type { PulseMap } from "./types/pulsemap";

export function App() {
	const [url, setUrl] = useState("");
	const [videoId, setVideoId] = useState<string | null>(null);
	const [map, setMap] = useState<PulseMap | null>(null);
	const [mapFilename, setMapFilename] = useState<string | null>(null);
	const [syncState, setSyncState] = useState<SyncState | null>(null);
	const [adapterReady, setAdapterReady] = useState(false);
	const [videoTitle, setVideoTitle] = useState<string | null>(null);

	const adapterRef = useRef<YouTubeEmbedAdapter | null>(null);
	const syncEngine = useMemo(() => new SyncEngine(), []);

	useEffect(() => {
		const unsub = syncEngine.subscribe(setSyncState);
		return () => {
			unsub();
			syncEngine.detach();
		};
	}, [syncEngine]);

	useEffect(() => {
		if (adapterReady && adapterRef.current && map) {
			syncEngine.attach(adapterRef.current, map);
		}
	}, [adapterReady, map, syncEngine]);

	const handleLoadVideo = useCallback(() => {
		const id = parseYouTubeVideoId(url);
		if (!id) return;

		adapterRef.current?.destroy();
		setAdapterReady(false);
		setVideoTitle(null);
		setSyncState(null);
		setVideoId(id);
	}, [url]);

	useEffect(() => {
		if (!videoId) return;

		const adapter = new YouTubeEmbedAdapter(
			"yt-player",
			videoId,
			() => {
				setAdapterReady(true);
				setVideoTitle(adapter.getVideoTitle());
			},
			() => {},
		);
		adapterRef.current = adapter;

		return () => {
			adapter.destroy();
			adapterRef.current = null;
		};
	}, [videoId]);

	function handleMapLoaded(loadedMap: PulseMap, filename: string) {
		setMap(loadedMap);
		setMapFilename(filename);

		const ytTarget = loadedMap.playback?.find((t) => t.platform === "youtube");
		if (ytTarget?.id && !videoId) {
			const ytUrl = `https://www.youtube.com/watch?v=${ytTarget.id}`;
			setUrl(ytUrl);
			adapterRef.current?.destroy();
			setAdapterReady(false);
			setVideoTitle(null);
			setSyncState(null);
			setVideoId(ytTarget.id);
		}
	}

	return (
		<div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
			<h1 style={{ fontSize: 20, marginBottom: 16 }}>PulseGuide</h1>

			<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
				<input
					type="text"
					placeholder="Paste YouTube URL..."
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
					style={{ flex: 1, padding: 8, fontSize: 14 }}
				/>
				<button type="button" onClick={handleLoadVideo} style={{ padding: "8px 16px" }}>
					Load
				</button>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 12,
				}}
			>
				<div
					style={{
						position: "relative",
						width: "100%",
						paddingBottom: "56.25%",
						background: "#000",
						borderRadius: 4,
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

				{videoTitle && (
					<div style={{ fontSize: 13, color: "#888" }}>
						<strong>Video:</strong> {videoTitle}
					</div>
				)}

				<div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
					<MapLoader onMapLoaded={handleMapLoaded} />
					{mapFilename && <span style={{ fontSize: 13, color: "#888" }}>{mapFilename}</span>}
				</div>

				<DebugPanel map={map} sync={syncState} />
			</div>
		</div>
	);
}
