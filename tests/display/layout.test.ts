import { describe, expect, test } from "bun:test";
import { alignWordsToLine, buildEntries, normalize } from "../../src/display/layout";
import type { ChordEvent, LyricLine, WordEvent } from "../../src/types/pulsemap";

describe("normalize", () => {
	test("lowercases and strips non-alphanumeric except apostrophes", () => {
		expect(normalize("Don't")).toBe("don't");
		expect(normalize("Hello, World!")).toBe("helloworld");
		expect(normalize("I'm")).toBe("i'm");
	});
});

describe("alignWordsToLine", () => {
	const words: WordEvent[] = [
		{ t: 1000, text: "hello" },
		{ t: 1200, text: "world" },
		{ t: 5000, text: "hello" },
		{ t: 5200, text: "world" },
	];

	test("matches text and returns aligned words", () => {
		const used = new Set<number>();
		const result = alignWordsToLine("hello world", 1000, words, used);
		expect(result).toEqual([
			{ t: 1000, text: "hello" },
			{ t: 1200, text: "world" },
		]);
		expect(used.has(0)).toBe(true);
		expect(used.has(1)).toBe(true);
	});

	test("picks the closer match for vocal repeats", () => {
		const used = new Set<number>();
		// lineT=4900 is closer to the second occurrence (t=5000) than the first (t=1000)
		const result = alignWordsToLine("hello world", 4900, words, used);
		expect(result[0].t).toBe(5000);
		expect(result[1].t).toBe(5200);
	});

	test("skips already-used indices", () => {
		const used = new Set<number>([0, 1]);
		// First occurrence is used, falls through to second
		const result = alignWordsToLine("hello world", 1000, words, used);
		expect(result[0].t).toBe(5000);
	});

	test("returns empty for no text match", () => {
		const used = new Set<number>();
		const result = alignWordsToLine("goodbye moon", 1000, words, used);
		expect(result).toEqual([]);
	});

	test("returns empty for empty line text", () => {
		const used = new Set<number>();
		const result = alignWordsToLine("", 1000, words, used);
		expect(result).toEqual([]);
	});

	test("returns empty for empty words array", () => {
		const used = new Set<number>();
		const result = alignWordsToLine("hello world", 1000, [], used);
		expect(result).toEqual([]);
	});

	test("matches case-insensitively", () => {
		const mixedWords: WordEvent[] = [
			{ t: 1000, text: "Hello" },
			{ t: 1200, text: "WORLD" },
		];
		const used = new Set<number>();
		const result = alignWordsToLine("hello world", 1000, mixedWords, used);
		expect(result).toHaveLength(2);
	});
});

describe("buildEntries", () => {
	test("attaches chords near a lyric line", () => {
		const lyrics: LyricLine[] = [{ t: 1000, text: "hello world", end: 3000 }];
		const words: WordEvent[] = [
			{ t: 1000, text: "hello" },
			{ t: 1200, text: "world" },
		];
		const chords: ChordEvent[] = [{ t: 1100, chord: "C" }];

		const entries = buildEntries(lyrics, words, chords);
		const lyricEntry = entries.find((e) => e.kind === "lyric");
		expect(lyricEntry).toBeDefined();
		if (lyricEntry?.kind === "lyric") {
			expect(lyricEntry.chords).toEqual([{ t: 1100, chord: "C" }]);
		}
	});

	test("chords far before lyrics become standalone pre-chords", () => {
		const lyrics: LyricLine[] = [{ t: 5000, text: "hello world", end: 7000 }];
		const words: WordEvent[] = [
			{ t: 5000, text: "hello" },
			{ t: 5200, text: "world" },
		];
		// Chord at t=1000 is well outside CHORD_WORD_TOLERANCE (500ms) of line.t=5000
		const chords: ChordEvent[] = [
			{ t: 1000, chord: "G" },
			{ t: 5100, chord: "C" },
		];

		const entries = buildEntries(lyrics, words, chords);
		expect(entries[0].kind).toBe("chords");
		if (entries[0].kind === "chords") {
			expect(entries[0].chords[0].chord).toBe("G");
		}
		expect(entries[1].kind).toBe("lyric");
		if (entries[1].kind === "lyric") {
			expect(entries[1].chords[0].chord).toBe("C");
		}
	});

	test("chords after last lyric become post-chords", () => {
		const lyrics: LyricLine[] = [{ t: 1000, text: "hello", end: 2000 }];
		const words: WordEvent[] = [{ t: 1000, text: "hello" }];
		const chords: ChordEvent[] = [
			{ t: 1100, chord: "C" },
			{ t: 5000, chord: "Am" },
			{ t: 8000, chord: "F" },
		];

		const entries = buildEntries(lyrics, words, chords);
		const lastEntry = entries[entries.length - 1];
		expect(lastEntry.kind).toBe("chords");
		if (lastEntry.kind === "chords") {
			expect(lastEntry.chords.map((c) => c.chord)).toEqual(["Am", "F"]);
		}
	});

	test("handles empty lyrics with only chords", () => {
		const chords: ChordEvent[] = [
			{ t: 0, chord: "C" },
			{ t: 2000, chord: "G" },
		];
		const entries = buildEntries([], [], chords);
		expect(entries).toHaveLength(1);
		expect(entries[0].kind).toBe("chords");
	});

	test("chord boundary respects nextLineT to prevent swallowing", () => {
		const lyrics: LyricLine[] = [
			{ t: 1000, text: "first line", end: 3000 },
			{ t: 10000, text: "second line", end: 12000 },
		];
		const words: WordEvent[] = [
			{ t: 1000, text: "first" },
			{ t: 1200, text: "line" },
			{ t: 10000, text: "second" },
			{ t: 10200, text: "line" },
		];
		// Chord at t=5000 is between the two lyric lines — should NOT be swallowed
		// by first line (nextLineT=10000 caps the chord window)
		const chords: ChordEvent[] = [
			{ t: 1100, chord: "C" },
			{ t: 5000, chord: "Am" },
			{ t: 10100, chord: "F" },
		];

		const entries = buildEntries(lyrics, words, chords);
		// Should be: lyric (first) with C, standalone Am, lyric (second) with F
		const chordEntries = entries.filter((e) => e.kind === "chords");
		expect(chordEntries).toHaveLength(1);
		if (chordEntries[0].kind === "chords") {
			expect(chordEntries[0].chords[0].chord).toBe("Am");
		}
	});
});
