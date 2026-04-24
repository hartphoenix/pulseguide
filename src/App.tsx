import { parseYouTubeVideoId, YouTubeEmbedAdapter } from "pulsemap/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { LyricsChordDisplay } from "./components/LyricsChordDisplay";
import { MapLoader } from "./components/MapLoader";
import { PlaybackControls } from "./components/PlaybackControls";
import type { VideoMode } from "./components/VideoPlayer";
import { VideoPlayer } from "./components/VideoPlayer";
import { useMediaQuery } from "./hooks/useMediaQuery";
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
	const [videoMode, setVideoMode] = useState<VideoMode>("expanded");
	const [showDebug, setShowDebug] = useState(false);

	const landscape = useMediaQuery("(min-width: 768px)");

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

		const adapter = new YouTubeEmbedAdapter({
			elementId: "yt-player",
			videoId,
		});

		adapter.waitForReady().then(() => {
			setAdapterReady(true);
			setVideoTitle(adapter.getVideoTitle());
		});

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

	function handleSeek(ms: number) {
		adapterRef.current?.seek(ms);
	}

	const hasContent = (map?.lyrics?.length ?? 0) > 0 || (map?.chords?.length ?? 0) > 0;
	const showVideoExpanded = videoMode === "expanded";

	const emptyState = (
		<div
			style={{
				flex: 1,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "#555",
				padding: 20,
			}}
		>
			{map ? "No lyrics in this map." : "Load a map to get started."}
		</div>
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: landscape && showVideoExpanded ? "row" : "column",
				height: "100vh",
				background: "#0a0a0a",
				color: "#ddd",
			}}
		>
			<div
				style={{
					padding: landscape && showVideoExpanded ? 12 : "8px 12px",
					flexShrink: 0,
				}}
			>
				<VideoPlayer
					mode={videoMode}
					onToggleMode={() => setVideoMode((m) => (m === "expanded" ? "minimized" : "expanded"))}
					videoTitle={videoTitle}
					playing={syncState?.playing ?? false}
					landscape={landscape}
				/>
			</div>

			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					minWidth: 0,
				}}
			>
				<div style={{ padding: "0 12px", flexShrink: 0 }}>
					{!videoId && (
						<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
							<input
								type="text"
								placeholder="Paste YouTube URL..."
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
								style={{
									flex: 1,
									padding: 8,
									fontSize: 14,
									background: "#222",
									color: "#ddd",
									border: "1px solid #444",
									borderRadius: 4,
								}}
							/>
							<button type="button" onClick={handleLoadVideo} style={{ padding: "8px 16px" }}>
								Load
							</button>
						</div>
					)}
					{adapterReady && (
						<PlaybackControls
							adapter={adapterRef.current}
							playing={syncState?.playing ?? false}
							rate={syncState?.rate ?? 1}
						/>
					)}
					<div
						style={{
							display: "flex",
							gap: 8,
							alignItems: "center",
							flexWrap: "wrap",
							marginTop: 8,
						}}
					>
						<MapLoader onMapLoaded={handleMapLoaded} />
						{mapFilename && <span style={{ fontSize: 12, color: "#888" }}>{mapFilename}</span>}
						<button
							type="button"
							onClick={() => setShowDebug((s) => !s)}
							style={{
								marginLeft: "auto",
								padding: "2px 8px",
								fontSize: 12,
								background: "#222",
								color: "#aaa",
								border: "1px solid #444",
								borderRadius: 4,
								cursor: "pointer",
							}}
						>
							{showDebug ? "Hide debug" : "Debug"}
						</button>
					</div>
					{showDebug && (
						<div style={{ marginTop: 8 }}>
							<DebugPanel map={map} sync={syncState} />
						</div>
					)}
				</div>

				{hasContent ? (
					<LyricsChordDisplay
						lyrics={map?.lyrics ?? []}
						words={map?.words ?? []}
						chords={map?.chords ?? []}
						sections={map?.sections ?? []}
						beats={map?.beats ?? []}
						activeLineT={syncState?.currentLyric?.t ?? null}
						activeWordT={syncState?.currentWord?.t ?? null}
						activeSection={syncState?.currentSection ?? null}
						position={syncState?.position ?? 0}
						onSeek={handleSeek}
					/>
				) : (
					emptyState
				)}
			</div>
		</div>
	);
}
