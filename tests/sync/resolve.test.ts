import { describe, expect, test } from "bun:test";
import { findCurrent, findCurrentBeat } from "../../src/sync/resolve";

describe("findCurrent", () => {
	test("returns null for empty or undefined events", () => {
		expect(findCurrent([], 100)).toBeNull();
		expect(findCurrent(undefined, 100)).toBeNull();
	});

	test("returns null when position is before all events", () => {
		const events = [{ t: 500 }, { t: 1000 }];
		expect(findCurrent(events, 200)).toBeNull();
	});

	test("returns the event at exact timestamp", () => {
		const events = [{ t: 500 }, { t: 1000 }, { t: 1500 }];
		expect(findCurrent(events, 1000)).toEqual({ t: 1000 });
	});

	test("returns the most recent event before position", () => {
		const events = [{ t: 500 }, { t: 1000 }, { t: 1500 }];
		expect(findCurrent(events, 1200)).toEqual({ t: 1000 });
	});

	test("returns the last event when position is past all events", () => {
		const events = [{ t: 500 }, { t: 1000 }];
		expect(findCurrent(events, 5000)).toEqual({ t: 1000 });
	});

	test("returns null when position is past the event's end", () => {
		const events = [
			{ t: 500, end: 800 },
			{ t: 1000, end: 1300 },
		];
		expect(findCurrent(events, 900)).toBeNull();
	});

	test("returns the event when position is within its end range", () => {
		const events = [
			{ t: 500, end: 800 },
			{ t: 1000, end: 1300 },
		];
		expect(findCurrent(events, 700)).toEqual({ t: 500, end: 800 });
		expect(findCurrent(events, 1100)).toEqual({ t: 1000, end: 1300 });
	});

	test("returns null when between events and previous has ended", () => {
		const events = [
			{ t: 0, end: 400 },
			{ t: 1000, end: 1400 },
		];
		expect(findCurrent(events, 600)).toBeNull();
	});
});

describe("findCurrentBeat", () => {
	test("returns null for empty or undefined beats", () => {
		expect(findCurrentBeat([], 100)).toBeNull();
		expect(findCurrentBeat(undefined, 100)).toBeNull();
	});

	test("returns the most recent beat regardless of downbeat", () => {
		const beats = [
			{ t: 0, downbeat: true },
			{ t: 500, downbeat: false },
			{ t: 1000, downbeat: false },
			{ t: 1500, downbeat: true },
		];
		expect(findCurrentBeat(beats, 700)).toEqual({ t: 500, downbeat: false });
	});

	test("does not use end field — always returns last beat at or before position", () => {
		const beats = [
			{ t: 0, downbeat: true, bpm: 120 },
			{ t: 500, downbeat: false },
		];
		// Even far past the last beat, findCurrentBeat still returns it (no end check)
		expect(findCurrentBeat(beats, 10000)).toEqual({ t: 500, downbeat: false });
	});
});
