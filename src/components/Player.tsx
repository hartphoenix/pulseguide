import { YouTubeEmbedAdapter } from "pulsemap/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
	type RecordingSession,
	type RecordingStartedInfo,
	startRecording,
} from "../recording/recorder";
import {
	deleteJourney,
	getBlob,
	listForMap,
	saveJourney,
	updateJourney,
} from "../storage/journeys";
import type { SyncState } from "../sync/engine";
import { SyncEngine } from "../sync/engine";
import type { Journey } from "../types/journey";
import type { PulseMap } from "../types/pulsemap";
import { openEditor } from "../utils/editor";
import { DebugPanel } from "./DebugPanel";
import { DrawerToggle } from "./DrawerToggle";
import { LyricsChordDisplay } from "./LyricsChordDisplay";
import { PlaybackControls } from "./PlaybackControls";
import type { RecordState } from "./RecordButton";
import { RecordingsDrawer } from "./RecordingsDrawer";
import { RecordingVolumeBar } from "./RecordingVolumeBar";
import type { VideoMode } from "./VideoPlayer";
import { VideoPlayer } from "./VideoPlayer";

const NUDGE_PERSIST_DEBOUNCE_MS = 200;
const SYNC_DRIFT_THRESHOLD_SEC = 0.15;
const MIN_RECORDING_MS = 5000;
const NUDGE_CLAMP = 2000;

export function Player() {
	const { mapId } = useParams<{ mapId: string }>();
	const navigate = useNavigate();

	const [map, setMap] = useState<PulseMap | null>(null);
	const [mapError, setMapError] = useState(false);
	const [videoId, setVideoId] = useState<string | null>(null);
	const [syncState, setSyncState] = useState<SyncState | null>(null);
	const [adapterReady, setAdapterReady] = useState(false);
	const [videoTitle, setVideoTitle] = useState<string | null>(null);
	const [videoMode, setVideoMode] = useState<VideoMode>("minimized");
	const [showDebug, setShowDebug] = useState(false);

	const [recordState, setRecordState] = useState<RecordState>("idle");
	const [recordError, setRecordError] = useState<string | null>(null);
	const recordingSessionRef = useRef<RecordingSession | null>(null);
	const recordingStartInfoRef = useRef<RecordingStartedInfo | null>(null);
	const prevRateRef = useRef<number | null>(null);

	const [journeys, setJourneys] = useState<Journey[]>([]);
	const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
	const audioElRef = useRef<HTMLAudioElement | null>(null);
	const audioObjectUrlRef = useRef<string | null>(null);
	const [recordingVolume, setRecordingVolume] = useState(1);
	const nudgeWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);

	const landscape = useMediaQuery("(min-width: 768px)");

	const adapterRef = useRef<YouTubeEmbedAdapter | null>(null);
	const syncEngine = useMemo(() => new SyncEngine(), []);

	const activeJourney = journeys.find((j) => j.id === activeJourneyId) ?? null;
	const wordClickEnabled = recordState !== "recording" && !drawerOpen;

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
				if (ytTarget?.id) setVideoId(ytTarget.id);
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
		const adapter = new YouTubeEmbedAdapter({ elementId: "yt-player", videoId });
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

	useEffect(() => {
		if (!map) return;
		let cancelled = false;
		listForMap(map.id).then((list) => {
			if (!cancelled) setJourneys(list);
		});
		return () => {
			cancelled = true;
		};
	}, [map]);

	const stopRecordingPlayback = useCallback(() => {
		if (audioElRef.current) {
			audioElRef.current.pause();
			audioElRef.current = null;
		}
		if (audioObjectUrlRef.current) {
			URL.revokeObjectURL(audioObjectUrlRef.current);
			audioObjectUrlRef.current = null;
		}
		setActiveJourneyId(null);
	}, []);

	const stopRecording = useCallback(async (): Promise<Journey | null> => {
		const session = recordingSessionRef.current;
		const info = recordingStartInfoRef.current;
		recordingSessionRef.current = null;
		recordingStartInfoRef.current = null;
		setRecordState("idle");

		if (prevRateRef.current !== null && adapterRef.current) {
			adapterRef.current.setPlaybackRate(prevRateRef.current);
			prevRateRef.current = null;
		}

		if (!session || !info || !map) return null;

		let result: Awaited<ReturnType<RecordingSession["stop"]>>;
		try {
			result = await session.stop();
		} catch {
			return null;
		}

		if (result.durationMs < MIN_RECORDING_MS) return null;

		const journey: Journey = {
			version: "0.1",
			id: crypto.randomUUID(),
			map_id: map.id,
			type: "recording",
			created_at: new Date().toISOString(),
			start_offset_ms: info.startMs,
			duration_ms: result.durationMs,
			latency_compensation_ms: Math.round(info.latencyMs),
			audio: { mime: result.mimeType },
		};

		try {
			await saveJourney(journey, result.blob);
			const list = await listForMap(map.id);
			setJourneys(list);
			return journey;
		} catch {
			setRecordError("Failed to save recording.");
			return null;
		}
	}, [map]);

	useEffect(() => {
		if (!adapterReady || !adapterRef.current) return;
		const adapter = adapterRef.current;
		const unsub = adapter.onStateChange((s) => {
			if (s !== "ended") return;
			if (recordState === "recording") {
				stopRecording();
			}
			if (activeJourneyId) {
				stopRecordingPlayback();
			}
		});
		return unsub;
	}, [adapterReady, recordState, activeJourneyId, stopRecording, stopRecordingPlayback]);

	useEffect(() => {
		const audio = audioElRef.current;
		if (!audio || !activeJourney || !syncState) return;
		const effectiveStart = activeJourney.start_offset_ms - activeJourney.latency_compensation_ms;
		const inRange =
			syncState.position >= effectiveStart &&
			syncState.position < effectiveStart + activeJourney.duration_ms;
		if (!syncState.playing || !inRange) {
			if (!audio.paused) audio.pause();
			return;
		}
		const targetSec = (syncState.position - effectiveStart) / 1000;
		if (Math.abs(audio.currentTime - targetSec) > SYNC_DRIFT_THRESHOLD_SEC) {
			audio.currentTime = Math.max(0, targetSec);
		}
		if (audio.paused) audio.play().catch(() => {});
	}, [activeJourney, syncState]);

	useEffect(() => {
		if (audioElRef.current) audioElRef.current.volume = recordingVolume;
	}, [recordingVolume]);

	useEffect(() => {
		if (recordState !== "recording") return;
		function handler(e: BeforeUnloadEvent) {
			e.preventDefault();
			e.returnValue = "";
		}
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [recordState]);

	const handleRecordClick = useCallback(async () => {
		if (recordState === "arming") return;
		if (recordState === "recording") {
			await stopRecording();
			return;
		}
		if (!adapterRef.current || !map) return;

		setRecordError(null);
		setRecordState("arming");

		const adapter = adapterRef.current;
		if (syncState && !syncState.playing) adapter.play();
		if (syncState && syncState.rate !== 1) {
			prevRateRef.current = syncState.rate;
			adapter.setPlaybackRate(1);
		}
		if (syncState && map.duration_ms && syncState.position >= map.duration_ms) {
			adapter.seek(0);
		}

		try {
			const session = await startRecording(() => adapterRef.current?.getPosition() ?? 0);
			recordingSessionRef.current = session;
			const info = await session.started;
			recordingStartInfoRef.current = info;
			setRecordState("recording");
		} catch {
			setRecordError("Microphone access required.");
			setRecordState("idle");
			recordingSessionRef.current = null;
			recordingStartInfoRef.current = null;
			if (prevRateRef.current !== null && adapterRef.current) {
				adapterRef.current.setPlaybackRate(prevRateRef.current);
				prevRateRef.current = null;
			}
		}
	}, [recordState, map, syncState, stopRecording]);

	const handleToggleActive = useCallback(
		async (id: string) => {
			if (activeJourneyId === id) {
				stopRecordingPlayback();
				return;
			}
			stopRecordingPlayback();

			const journey = journeys.find((j) => j.id === id);
			if (!journey || !adapterRef.current) return;

			const blob = await getBlob(id);
			if (!blob) return;

			const url = URL.createObjectURL(blob);
			audioObjectUrlRef.current = url;
			const audio = new Audio(url);
			audio.volume = recordingVolume;
			audio.addEventListener("ended", () => {
				if (audioElRef.current === audio) {
					audioElRef.current = null;
					setActiveJourneyId(null);
				}
				URL.revokeObjectURL(url);
				if (audioObjectUrlRef.current === url) audioObjectUrlRef.current = null;
			});
			audioElRef.current = audio;

			const effectiveStart = journey.start_offset_ms - journey.latency_compensation_ms;
			adapterRef.current.seek(Math.max(0, effectiveStart));
			adapterRef.current.play();
			setActiveJourneyId(id);
		},
		[activeJourneyId, journeys, recordingVolume, stopRecordingPlayback],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			if (activeJourneyId === id) stopRecordingPlayback();
			await deleteJourney(id);
			if (map) {
				const list = await listForMap(map.id);
				setJourneys(list);
			}
		},
		[activeJourneyId, map, stopRecordingPlayback],
	);

	const handleNudge = useCallback(
		(id: string, deltaMs: number) => {
			const current = journeys.find((j) => j.id === id);
			if (!current) return;
			const newVal = Math.max(
				-NUDGE_CLAMP,
				Math.min(NUDGE_CLAMP, current.latency_compensation_ms + deltaMs),
			);
			const updated = { ...current, latency_compensation_ms: newVal };
			setJourneys((prev) => prev.map((j) => (j.id === id ? updated : j)));

			if (activeJourneyId === id && audioElRef.current && adapterRef.current) {
				const effectiveStart = updated.start_offset_ms - newVal;
				const pos = adapterRef.current.getPosition();
				audioElRef.current.currentTime = Math.max(0, (pos - effectiveStart) / 1000);
			}

			if (nudgeWriteTimer.current) clearTimeout(nudgeWriteTimer.current);
			nudgeWriteTimer.current = setTimeout(() => {
				updateJourney(id, { latency_compensation_ms: newVal });
			}, NUDGE_PERSIST_DEBOUNCE_MS);
		},
		[journeys, activeJourneyId],
	);

	const handleResetNudge = useCallback(
		(id: string) => {
			const current = journeys.find((j) => j.id === id);
			if (!current) return;
			const updated = { ...current, latency_compensation_ms: 0 };
			setJourneys((prev) => prev.map((j) => (j.id === id ? updated : j)));

			if (activeJourneyId === id && audioElRef.current && adapterRef.current) {
				const effectiveStart = updated.start_offset_ms;
				const pos = adapterRef.current.getPosition();
				audioElRef.current.currentTime = Math.max(0, (pos - effectiveStart) / 1000);
			}

			if (nudgeWriteTimer.current) clearTimeout(nudgeWriteTimer.current);
			updateJourney(id, { latency_compensation_ms: 0 });
		},
		[journeys, activeJourneyId],
	);

	const handleSongsLinkClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement>) => {
			if (recordState === "recording") {
				e.preventDefault();
				setPendingNavTarget("/");
			}
		},
		[recordState],
	);

	const handleConfirmNavAway = useCallback(async () => {
		const target = pendingNavTarget;
		await stopRecording();
		setPendingNavTarget(null);
		if (target) navigate(target);
	}, [pendingNavTarget, stopRecording, navigate]);

	const getAmplitude = useCallback(() => recordingSessionRef.current?.amplitude() ?? 0, []);

	function handleSeek(ms: number) {
		if (!wordClickEnabled) return;
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
				position: "relative",
			}}
		>
			<RecordingVolumeBar active={recordState === "recording"} getAmplitude={getAmplitude} />

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
							onClick={handleSongsLinkClick}
							style={{ color: "#888", textDecoration: "none", fontSize: 14 }}
						>
							← Songs
						</Link>
						{map?.metadata && (
							<span style={{ fontSize: 14, color: "#aaa" }}>
								{map.metadata.title}
								{map.metadata.artist && ` — ${map.metadata.artist}`}
							</span>
						)}
						{map && (
							<button
								type="button"
								onClick={() =>
									openEditor({
										mapId: map.id,
										t: syncState?.position ?? 0,
										source: "pulseguide",
									})
								}
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
								Correct this map
							</button>
						)}
						<button
							type="button"
							onClick={() => setShowDebug((s) => !s)}
							style={{
								marginLeft: map ? 0 : "auto",
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
						<DrawerToggle
							count={journeys.length}
							activePlayback={activeJourneyId !== null}
							open={drawerOpen}
							onClick={() => setDrawerOpen((o) => !o)}
						/>
					</div>
					{adapterReady && (
						<PlaybackControls
							adapter={adapterRef.current}
							playing={syncState?.playing ?? false}
							rate={syncState?.rate ?? 1}
							recording={recordState === "recording"}
							recordingPlayback={activeJourneyId !== null}
							recordState={recordState}
							recordError={recordError}
							onRecordClick={handleRecordClick}
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
						mapId={map.id}
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

			<RecordingsDrawer
				open={drawerOpen}
				journeys={journeys}
				activeId={activeJourneyId}
				recordingVolume={recordingVolume}
				onSetRecordingVolume={setRecordingVolume}
				onToggleActive={handleToggleActive}
				onDelete={handleDelete}
				onNudge={handleNudge}
				onResetNudge={handleResetNudge}
				onClose={() => setDrawerOpen(false)}
			/>

			{pendingNavTarget !== null && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.6)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
					}}
				>
					<div
						style={{
							background: "#1a1a1a",
							border: "1px solid #444",
							borderRadius: 6,
							padding: 20,
							maxWidth: 360,
							display: "flex",
							flexDirection: "column",
							gap: 16,
						}}
					>
						<div style={{ color: "#ddd", fontSize: 14 }}>Stop recording & save?</div>
						<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
							<button
								type="button"
								onClick={() => setPendingNavTarget(null)}
								style={{
									padding: "4px 12px",
									background: "#222",
									color: "#ddd",
									border: "1px solid #444",
									borderRadius: 4,
									cursor: "pointer",
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmNavAway}
								style={{
									padding: "4px 12px",
									background: "#2a4a2a",
									color: "#cfe6cf",
									border: "1px solid #5fa75f",
									borderRadius: 4,
									cursor: "pointer",
								}}
							>
								Yes
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
