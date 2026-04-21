/**
 * PulseMap protocol types — copied from pulsemap/schema/map.ts.
 * Source of truth: https://github.com/hartphoenix/pulsemap
 */

export type SectionType =
	| "intro"
	| "verse"
	| "pre-chorus"
	| "chorus"
	| "bridge"
	| "solo"
	| "interlude"
	| "outro"
	| "coda"
	| (string & {});

export interface Fingerprint {
	chromaprint: string;
	algorithm: number;
	duration: number;
}

export interface MapMetadata {
	title?: string;
	artist?: string;
	album?: string;
	key?: string;
	tempo?: number;
	time_signature?: string;
	extra?: Record<string, string | number | string[]>;
}

export interface PlaybackCapabilities {
	play?: boolean;
	pause?: boolean;
	seek?: boolean;
	setPosition?: boolean;
	getPosition?: boolean;
	rate?: "continuous" | number[];
	volume?: boolean;
	mute?: boolean;
}

export interface PlaybackTarget {
	platform: string;
	uri?: string;
	id?: string;
	capabilities: PlaybackCapabilities;
	added?: string;
}

export interface MidiTrack {
	index: number;
	label: string;
}

export interface MidiReference {
	sha256: string;
	duration_ms: number;
	offset_ms?: number;
	uri?: string;
	tracks?: MidiTrack[];
}

export interface BeatEvent {
	t: number;
	downbeat: boolean;
	bpm?: number;
	time_sig?: string;
}

export interface AnalysisProvenance {
	tool: string;
	version?: string;
	date?: string;
	manual?: boolean;
}

export interface LyricLine {
	t: number;
	text: string;
	end?: number;
}

export interface ChordEvent {
	t: number;
	chord: string;
	end?: number;
}

export interface Section {
	t: number;
	type: SectionType;
	label?: string;
	end: number;
}

export interface PulseMap {
	version: string;
	id: string;
	duration_ms: number;
	fingerprint?: Fingerprint;
	metadata?: MapMetadata;
	playback?: PlaybackTarget[];
	lyrics?: LyricLine[];
	chords?: ChordEvent[];
	beats?: BeatEvent[];
	sections?: Section[];
	midi?: MidiReference[];
	analysis?: Record<string, AnalysisProvenance>;
}
