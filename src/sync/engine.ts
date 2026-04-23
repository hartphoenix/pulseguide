import type { PlaybackAdapter } from "../adapters/types";
import type {
	BeatEvent,
	ChordEvent,
	LyricLine,
	PulseMap,
	Section,
	WordEvent,
} from "../types/pulsemap";

export interface SyncState {
	position: number;
	playing: boolean;
	rate: number;
	currentLyric: LyricLine | null;
	currentWord: WordEvent | null;
	currentChord: ChordEvent | null;
	currentSection: Section | null;
	currentBeat: BeatEvent | null;
	bpm: number | null;
	timeSig: string | null;
}

type SyncListener = (state: SyncState) => void;

function findCurrent<T extends { t: number; end?: number }>(
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

function findCurrentBeat(beats: BeatEvent[] | undefined, position: number): BeatEvent | null {
	if (!beats?.length) return null;
	let result: BeatEvent | null = null;
	for (const beat of beats) {
		if (beat.t > position) break;
		result = beat;
	}
	return result;
}

export class SyncEngine {
	private adapter: PlaybackAdapter | null = null;
	private map: PulseMap | null = null;
	private listeners = new Set<SyncListener>();
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private pollMs: number;
	private lastBpm: number | null = null;
	private lastTimeSig: string | null = null;

	constructor(pollMs = 50) {
		this.pollMs = pollMs;
	}

	attach(adapter: PlaybackAdapter, map: PulseMap) {
		this.detach();
		this.adapter = adapter;
		this.map = map;
		this.lastBpm = null;
		this.lastTimeSig = null;
		this.start();
	}

	detach() {
		this.stop();
		this.adapter = null;
		this.map = null;
	}

	subscribe(listener: SyncListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private start() {
		this.intervalId = setInterval(() => this.tick(), this.pollMs);
	}

	private stop() {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private tick() {
		if (!this.adapter || !this.map) return;

		const position = this.adapter.getPosition();
		const playing = this.adapter.isPlaying();
		const rate = this.adapter.getPlaybackRate();

		const currentLyric = findCurrent(this.map.lyrics, position);
		const currentWord = findCurrent(this.map.words, position);
		const currentChord = findCurrent(this.map.chords, position);
		const currentSection = findCurrent(this.map.sections, position);
		const currentBeat = findCurrentBeat(this.map.beats, position);

		if (currentBeat?.bpm !== undefined) this.lastBpm = currentBeat.bpm;
		if (currentBeat?.time_sig !== undefined) this.lastTimeSig = currentBeat.time_sig;

		const state: SyncState = {
			position,
			playing,
			rate,
			currentLyric,
			currentWord,
			currentChord,
			currentSection,
			currentBeat,
			bpm: this.lastBpm,
			timeSig: this.lastTimeSig,
		};

		for (const listener of this.listeners) {
			listener(state);
		}
	}
}
