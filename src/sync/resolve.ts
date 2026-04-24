import type { BeatEvent } from "../types/pulsemap";

export function findCurrent<T extends { t: number; end?: number }>(
	events: T[] | undefined,
	position: number,
): T | null {
	if (!events?.length) return null;
	let result: T | null = null;
	for (const event of events) {
		if (event.t > position) break;
		result = event;
	}
	if (result && result.end !== undefined && result.end < position) return null;
	return result;
}

export function findCurrentBeat(
	beats: BeatEvent[] | undefined,
	position: number,
): BeatEvent | null {
	if (!beats?.length) return null;
	let result: BeatEvent | null = null;
	for (const beat of beats) {
		if (beat.t > position) break;
		result = beat;
	}
	return result;
}
