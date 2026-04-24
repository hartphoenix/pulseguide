import type { BeatEvent, ChordEvent, LyricLine, Section, WordEvent } from "../types/pulsemap";

// ms window for associating a chord with a lyric line vs. leaving it standalone.
// 500ms catches syncopated chord changes without pulling in chords from adjacent passages.
export const CHORD_WORD_TOLERANCE = 500;

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
): WordEvent[] {
	const lineTextWords = lineText.split(/\s+/).filter(Boolean);
	const n = lineTextWords.length;
	if (n === 0 || words.length === 0) return [];

	let bestStart = -1;
	let bestDist = Number.POSITIVE_INFINITY;

	for (let start = 0; start <= words.length - n; start++) {
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

		const dist = Math.abs(words[start].t - lineT);
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

export function buildEntries(
	lyrics: LyricLine[],
	words: WordEvent[],
	chords: ChordEvent[],
): DisplayEntry[] {
	const usedWordIndices = new Set<number>();
	const entries: DisplayEntry[] = [];
	let chordCursor = 0;

	for (let i = 0; i < lyrics.length; i++) {
		const line = lyrics[i];
		const lineWords = alignWordsToLine(line.text, line.t, words, usedWordIndices);

		// Chord boundaries use line.t (the phrase's canonical position), not the first
		// word's timestamp. LRCLIB lyric line `end` values extend to the next line's start,
		// which can be minutes later across an instrumental break. Using line.t prevents
		// an entire instrumental section's chords from being swallowed by one lyric line.
		const chordStart = line.t - CHORD_WORD_TOLERANCE;
		const nextLineT = i < lyrics.length - 1 ? lyrics[i + 1].t : Number.POSITIVE_INFINITY;
		const chordEnd = Math.min(
			lineWords.length > 0
				? lineWords[lineWords.length - 1].t + CHORD_WORD_TOLERANCE
				: line.t + CHORD_WORD_TOLERANCE,
			nextLineT,
		);

		const preChords: ChordEvent[] = [];
		while (chordCursor < chords.length && chords[chordCursor].t < chordStart) {
			preChords.push(chords[chordCursor]);
			chordCursor++;
		}
		if (preChords.length > 0) {
			entries.push({ kind: "chords", chords: preChords, t: preChords[0].t });
		}

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
	if (postChords.length > 0) {
		entries.push({ kind: "chords", chords: postChords, t: postChords[0].t });
	}

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
