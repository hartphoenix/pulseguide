/**
 * Local journey: a sidecar JSON describing one user-recorded audio
 * track over a map. Lean MVP shape; will likely diverge from the
 * canonical PulseMap journey spec (which still lives only in PRD
 * prose). Bump `version` when migrating.
 *
 * The audio Blob is stored separately in the `audioBlobs` IndexedDB
 * store, keyed by the same `id`.
 */
export type Journey = {
	version: "0.1";
	id: string;
	map_id: string;
	type: "recording";
	created_at: string;
	start_offset_ms: number;
	duration_ms: number;
	/**
	 * Single offset applied at playback time:
	 * effective_start = start_offset_ms - latency_compensation_ms.
	 * Initialized at record-time to AudioContext.outputLatency * 1000
	 * (the OS's best guess; unreliable on Bluetooth). User can mutate
	 * it via ear-nudge controls during playback. Clamped ±2000 ms.
	 */
	latency_compensation_ms: number;
	audio: { mime: string };
};
