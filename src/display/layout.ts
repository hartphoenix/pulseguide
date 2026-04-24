import type { BeatEvent, ChordEvent, LyricLine, Section, WordEvent } from "../types/pulsemap";

// ms window for associating a chord with the start of a lyric line (pickup chords).
export const CHORD_WORD_TOLERANCE = 500;

// Fallback chord window past last word when beat data is unavailable.
// ~2 seconds approximates one bar at moderate tempo.
const LINE_CHORD_FALLBACK = 2000;

// Standalone chord entries spanning more than this are split into smaller groups.
// 20 seconds ≈ 8 bars at moderate tempo — two systems on a lead sheet.
const CHORD_GROUP_MAX_SPAN = 20000;

export type DisplayEntry =
	| { kind: "lyric"; line: LyricLine; words: WordEvent[]; chords: ChordEvent[] }
	| { kind: "chords"; chords: ChordEvent[]; t: number };

export interface Measure {
	t: number;
	end: number;
	chords: ChordEvent[];
}

export interface SectionGroup {
	section: Section;
	entries: DisplayEntry[];
}

// Preserves apostrophes so contractions ("don't", "I'm") match between lyric text and word events.
export function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Matches word events from the flat words[] array to a lyric line by text content
 * and timestamp proximity.
 *
 * A sequential cursor doesn't work here: vocal repeats (e.g. a chorus sung three
 * times) mean the same text appears multiple times in words[]. A cursor consumes
 * the first text match regardless of timing, so by the second chorus it's pointing
 * at the wrong part of the song.
 *
 * Instead, this scans for every contiguous subsequence in words[] that matches the
 * line's text, then picks the one closest to line.t. Far-away vocal repeats lose
 * to the nearby match. Pickup words (sung slightly before line.t) still match
 * because proximity is absolute distance. Ad-libs (words not in the lyric text)
 * are skipped because their text doesn't match.
 */
export function alignWordsToLine(
	lineText: string,
	lineT: number,
	words: WordEvent[],
	usedIndices: Set<number>,
	maxDist = Number.POSITIVE_INFINITY,
): WordEvent[] {
	const lineTextWords = lineText.split(/\s+/).filter(Boolean);
	const n = lineTextWords.length;
	if (n === 0 || words.length === 0) return [];

	let bestStart = -1;
	let bestDist = Number.POSITIVE_INFINITY;

	for (let start = 0; start <= words.length - n; start++) {
		const dist = Math.abs(words[start].t - lineT);
		if (dist > maxDist) continue;

		let anyUsed = false;
		for (let j = start; j < start + n; j++) {
			if (usedIndices.has(j)) {
				anyUsed = true;
				break;
			}
		}
		if (anyUsed) continue;

		const matches = lineTextWords.every(
			(lw, idx) => normalize(words[start + idx].text) === normalize(lw),
		);
		if (!matches) continue;

		if (dist < bestDist) {
			bestDist = dist;
			bestStart = start;
		}
	}

	if (bestStart < 0) return [];

	const result = words.slice(bestStart, bestStart + n);
	for (let j = bestStart; j < bestStart + n; j++) {
		usedIndices.add(j);
	}
	return result;
}

// Duration of one bar near `t`, measured between the two nearest downbeats.
function barDurationNear(t: number, beats: BeatEvent[]): number | null {
	let prev: number | null = null;
	for (const beat of beats) {
		if (beat.downbeat) {
			if (beat.t > t && prev !== null) return beat.t - prev;
			prev = beat.t;
		}
	}
	return null;
}

// Find the timestamp one full bar after `t`: the second downbeat past `t`.
function barBoundaryAfter(t: number, beats: BeatEvent[]): number | null {
	let firstDownbeat = -1;
	for (const beat of beats) {
		if (beat.t > t && beat.downbeat) {
			if (firstDownbeat < 0) {
				firstDownbeat = beat.t;
			} else {
				return beat.t;
			}
		}
	}
	return null;
}

function pushChordEntries(entries: DisplayEntry[], chords: ChordEvent[]): void {
	if (chords.length === 0) return;
	let groupStart = 0;
	for (let i = 1; i < chords.length; i++) {
		if (chords[i].t - chords[groupStart].t > CHORD_GROUP_MAX_SPAN) {
			entries.push({
				kind: "chords",
				chords: chords.slice(groupStart, i),
				t: chords[groupStart].t,
			});
			groupStart = i;
		}
	}
	entries.push({ kind: "chords", chords: chords.slice(groupStart), t: chords[groupStart].t });
}

export function buildEntries(
	lyrics: LyricLine[],
	words: WordEvent[],
	chords: ChordEvent[],
	beats: BeatEvent[] = [],
): DisplayEntry[] {
	const usedWordIndices = new Set<number>();
	const entries: DisplayEntry[] = [];
	let chordCursor = 0;

	const matchWindow = barDurationNear(0, beats) ?? LINE_CHORD_FALLBACK;

	for (let i = 0; i < lyrics.length; i++) {
		const line = lyrics[i];
		const lineWords = alignWordsToLine(line.text, line.t, words, usedWordIndices, matchWindow);

		const chordStart = line.t - CHORD_WORD_TOLERANCE;
		const nextLineT = i < lyrics.length - 1 ? lyrics[i + 1].t : Number.POSITIVE_INFINITY;

		// Chord window extends one full bar past the last word (beat-informed).
		// Falls back to a fixed budget when beat data is unavailable.
		const anchorT = lineWords.length > 0 ? lineWords[lineWords.length - 1].t : line.t;
		const chordEnd = Math.min(
			barBoundaryAfter(anchorT, beats) ?? anchorT + LINE_CHORD_FALLBACK,
			nextLineT,
		);

		const preChords: ChordEvent[] = [];
		while (chordCursor < chords.length && chords[chordCursor].t < chordStart) {
			preChords.push(chords[chordCursor]);
			chordCursor++;
		}
		pushChordEntries(entries, preChords);

		const lineChords: ChordEvent[] = [];
		while (chordCursor < chords.length && chords[chordCursor].t <= chordEnd) {
			lineChords.push(chords[chordCursor]);
			chordCursor++;
		}

		entries.push({ kind: "lyric", line, words: lineWords, chords: lineChords });
	}

	const postChords: ChordEvent[] = [];
	while (chordCursor < chords.length) {
		postChords.push(chords[chordCursor]);
		chordCursor++;
	}
	pushChordEntries(entries, postChords);

	return entries;
}

export function buildMeasures(beats: BeatEvent[], start: number, end: number): Measure[] {
	const measures: Measure[] = [];
	const sectionBeats = beats.filter((b) => b.t >= start && b.t < end);

	for (let i = 0; i < sectionBeats.length; i++) {
		if (!sectionBeats[i].downbeat && measures.length === 0) continue;
		if (sectionBeats[i].downbeat) {
			const nextDownbeat = sectionBeats.find((b, j) => j > i && b.downbeat);
			measures.push({
				t: sectionBeats[i].t,
				end: nextDownbeat ? nextDownbeat.t : end,
				chords: [],
			});
		}
	}

	// Pickup measure: if chords exist before the first downbeat, create a partial measure
	// so those chords have somewhere to render.
	if (measures.length > 0 && measures[0].t > start) {
		measures.unshift({ t: start, end: measures[0].t, chords: [] });
	}

	// No downbeats in range: create a single measure spanning the full range
	// so chords aren't silently dropped.
	if (measures.length === 0 && start < end) {
		measures.push({ t: start, end, chords: [] });
	}

	return measures;
}

export function groupBySection(entries: DisplayEntry[], sections: Section[]): SectionGroup[] {
	if (!sections.length) {
		return [{ section: { t: 0, type: "", end: Number.POSITIVE_INFINITY }, entries }];
	}

	return sections.map((section) => {
		const sectionEntries = entries.filter((e) => {
			const t = e.kind === "lyric" ? (e.words.length > 0 ? e.words[0].t : e.line.t) : e.t;
			return t >= section.t && t < section.end;
		});

		return { section, entries: sectionEntries };
	});
}

export function formatSectionLabel(section: Section): string {
	if (section.label) return section.label;
	if (section.type && section.type !== "section") {
		return section.type.charAt(0).toUpperCase() + section.type.slice(1);
	}
	return "";
}

export function findChordForWord(word: WordEvent, lineChords: ChordEvent[]): ChordEvent | null {
	let best: ChordEvent | null = null;
	let bestDist = CHORD_WORD_TOLERANCE + 1;
	for (const chord of lineChords) {
		const dist = Math.abs(chord.t - word.t);
		if (dist < bestDist) {
			bestDist = dist;
			best = chord;
		}
	}
	return best;
}
