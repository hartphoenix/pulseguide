import { describe, expect, test } from "bun:test";
import { formatChord } from "../../src/display/format-chord";

describe("formatChord", () => {
	test("passes through plain chords unchanged", () => {
		expect(formatChord("C")).toBe("C");
		expect(formatChord("Am")).toBe("Am");
		expect(formatChord("G7")).toBe("G7");
		expect(formatChord("Dm7")).toBe("Dm7");
		expect(formatChord("Fmaj7")).toBe("Fmaj7");
		expect(formatChord("Fsus4")).toBe("Fsus4");
	});

	test("replaces sharp after root", () => {
		expect(formatChord("C#")).toBe("C♯");
		expect(formatChord("F#m")).toBe("F♯m");
		expect(formatChord("G#dim")).toBe("G♯dim");
	});

	test("replaces flat after root", () => {
		expect(formatChord("Bb")).toBe("B♭");
		expect(formatChord("Eb")).toBe("E♭");
		expect(formatChord("Abm")).toBe("A♭m");
	});

	test("replaces accidentals in bass notes", () => {
		expect(formatChord("A/C#")).toBe("A/C♯");
		expect(formatChord("Bb/D")).toBe("B♭/D");
		expect(formatChord("Gm/A#")).toBe("Gm/A♯");
		expect(formatChord("E/G#")).toBe("E/G♯");
		expect(formatChord("Gb/Bb")).toBe("G♭/B♭");
	});

	test("does not mangle 'dim', 'mb', or other quality text", () => {
		expect(formatChord("Bdim")).toBe("Bdim");
		expect(formatChord("Cdim7")).toBe("Cdim7");
	});

	test("handles double sharps and double flats", () => {
		expect(formatChord("F##")).toBe("F×");
		expect(formatChord("Bbb")).toBe("B𝄫");
	});
});
