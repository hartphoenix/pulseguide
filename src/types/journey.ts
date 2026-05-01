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
	version: "0.2";
	id: string;
	map_id: string;
	type: "recording";
	created_at: string;
	start_offset_ms: number;
	duration_ms: number;
	/**
	 * Delta applied to the recording's start position at playback:
	 * effective_start = start_offset_ms + playback_offset_ms.
	 *
	 * Sign convention follows DAW / LRC convention: positive shifts
	 * the recording later in map-time, negative earlier. Initialized
	 * at record-time to -(AudioContext.outputLatency * 1000) — a
	 * rough hint, unreliable on Bluetooth and headphones. Users
	 * adjust by ear via nudge controls. If a future automatic
	 * calibration source is added, it should live in its own field
	 * and be summed with this one at playback.
	 *
	 * Clamped to ±2000 ms.
	 */
	playback_offset_ms: number;
	audio: { mime: string };
};
