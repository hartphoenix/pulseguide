import { YouTubeEmbedAdapter } from "pulsemap/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { SyncState } from "../sync/engine";
import { SyncEngine } from "../sync/engine";
import type { PulseMap } from "../types/pulsemap";
import { DebugPanel } from "./DebugPanel";
import { LyricsChordDisplay } from "./LyricsChordDisplay";
import { PlaybackControls } from "./PlaybackControls";
import type { VideoMode } from "./VideoPlayer";
import { VideoPlayer } from "./VideoPlayer";

export function Player() {
	const { mapId } = useParams<{ mapId: string }>();

	const [map, setMap] = useState<PulseMap | null>(null);
	const [mapError, setMapError] = useState(false);
	const [videoId, setVideoId] = useState<string | null>(null);
	const [syncState, setSyncState] = useState<SyncState | null>(null);
	const [adapterReady, setAdapterReady] = useState(false);
	const [videoTitle, setVideoTitle] = useState<string | null>(null);
	const [videoMode, setVideoMode] = useState<VideoMode>("minimized");
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
		if (!mapId) return;
		setMap(null);
		setMapError(false);
		setVideoId(null);
		setAdapterReady(false);
		setVideoTitle(null);
		setSyncState(null);
		adapterRef.current?.destroy();
		adapterRef.current = null;

		fetch(`/maps/${mapId}.json`)
			.then((res) => {
				if (!res.ok) throw new Error("not found");
				return res.json();
			})
			.then((loaded: PulseMap) => {
				setMap(loaded);
				const ytTarget = loaded.playback?.find((t) => t.platform === "youtube");
				if (ytTarget?.id) {
					setVideoId(ytTarget.id);
				}
			})
			.catch(() => setMapError(true));
	}, [mapId]);

	useEffect(() => {
		if (adapterReady && adapterRef.current && map) {
			syncEngine.attach(adapterRef.current, map);
		}
	}, [adapterReady, map, syncEngine]);

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

	function handleSeek(ms: number) {
		adapterRef.current?.seek(ms);
	}

	if (mapError) {
		return (
			<div
				style={{
					minHeight: "100vh",
					background: "#0a0a0a",
					color: "#ddd",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					gap: 16,
				}}
			>
				<p>Map not found.</p>
				<Link to="/" style={{ color: "#6ba3d6" }}>
					Back to songs
				</Link>
			</div>
		);
	}

	const hasContent = (map?.lyrics?.length ?? 0) > 0 || (map?.chords?.length ?? 0) > 0;
	const showVideoExpanded = videoMode === "expanded";

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
					<div
						style={{
							display: "flex",
							gap: 8,
							alignItems: "center",
							padding: "8px 0",
						}}
					>
						<Link
							to="/"
							style={{
								color: "#888",
								textDecoration: "none",
								fontSize: 14,
							}}
						>
							← Songs
						</Link>
						{map?.metadata && (
							<span style={{ fontSize: 14, color: "#aaa" }}>
								{map.metadata.title}
								{map.metadata.artist && ` — ${map.metadata.artist}`}
							</span>
						)}
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
					{adapterReady && (
						<PlaybackControls
							adapter={adapterRef.current}
							playing={syncState?.playing ?? false}
							rate={syncState?.rate ?? 1}
						/>
					)}
					{showDebug && (
						<div style={{ marginTop: 8 }}>
							<DebugPanel map={map} sync={syncState} />
						</div>
					)}
				</div>

				{!map ? (
					<div
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "#555",
						}}
					>
						Loading...
					</div>
				) : hasContent ? (
					<LyricsChordDisplay
						lyrics={map.lyrics ?? []}
						words={map.words ?? []}
						chords={map.chords ?? []}
						sections={map.sections ?? []}
						beats={map.beats ?? []}
						activeLineT={syncState?.currentLyric?.t ?? null}
						activeWordT={syncState?.currentWord?.t ?? null}
						activeChordT={syncState?.currentChord?.t ?? null}
						activeSection={syncState?.currentSection ?? null}
						position={syncState?.position ?? 0}
						onSeek={handleSeek}
					/>
				) : (
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
						No lyrics or chords in this map.
					</div>
				)}
			</div>
		</div>
	);
}
