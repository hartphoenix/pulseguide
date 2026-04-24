import { afterEach, describe, expect, test } from "bun:test";
import type { PlaybackAdapter, PlaybackState } from "../../src/adapters/types";
import { SyncEngine, type SyncState } from "../../src/sync/engine";
import type { PulseMap } from "../../src/types/pulsemap";

class MockAdapter implements PlaybackAdapter {
	readonly platform = "mock";
	readonly capabilities = {};
	position = 0;
	playing = true;
	rate = 1;

	waitForReady = async () => {};
	getPosition = () => this.position;
	seek = () => {};
	play = () => {};
	pause = () => {};
	isPlaying = () => this.playing;
	getState = (): PlaybackState => "playing";
	getPlaybackRate = () => this.rate;
	setPlaybackRate = () => {};
	getVolume = () => 1;
	setVolume = () => {};
	isMuted = () => false;
	setMuted = () => {};
	onStateChange = () => () => {};
	destroy = () => {};
}

function makeMap(overrides: Partial<PulseMap> = {}): PulseMap {
	return {
		version: "0.1.0",
		id: "test",
		duration_ms: 10000,
		...overrides,
	};
}

function collectStates(engine: SyncEngine, count: number): Promise<SyncState[]> {
	return new Promise((resolve) => {
		const states: SyncState[] = [];
		const unsub = engine.subscribe((s) => {
			states.push({ ...s });
			if (states.length >= count) {
				unsub();
				resolve(states);
			}
		});
	});
}

let engine: SyncEngine;

afterEach(() => {
	engine?.detach();
});

describe("SyncEngine", () => {
	test("carries forward bpm from sparse beat events", async () => {
		engine = new SyncEngine(10);
		const adapter = new MockAdapter();
		const map = makeMap({
			beats: [
				{ t: 0, downbeat: true, bpm: 120 },
				{ t: 500, downbeat: false },
				{ t: 1000, downbeat: true, bpm: 140 },
			],
		});

		// Position at t=100: findCurrentBeat returns beat at t=0 (has bpm=120)
		adapter.position = 100;
		const collected = collectStates(engine, 1);
		engine.attach(adapter, map);
		const [state1] = await collected;

		expect(state1.bpm).toBe(120);

		// Move to t=600: current beat is t=500 (no bpm), but 120 carries forward
		adapter.position = 600;
		const [state2] = await collectStates(engine, 1);
		expect(state2.bpm).toBe(120);

		// Move to t=1100: current beat is t=1000 (bpm=140), updates
		adapter.position = 1100;
		const [state3] = await collectStates(engine, 1);
		expect(state3.bpm).toBe(140);
	});

	test("carries forward time_sig from sparse beat events", async () => {
		engine = new SyncEngine(10);
		const adapter = new MockAdapter();
		const map = makeMap({
			beats: [
				{ t: 0, downbeat: true, time_sig: "4/4" },
				{ t: 500, downbeat: false },
				{ t: 1000, downbeat: true, time_sig: "3/4" },
			],
		});

		adapter.position = 100;
		const collected = collectStates(engine, 1);
		engine.attach(adapter, map);
		const [state1] = await collected;

		expect(state1.timeSig).toBe("4/4");

		adapter.position = 600;
		const [state2] = await collectStates(engine, 1);
		expect(state2.timeSig).toBe("4/4");

		adapter.position = 1100;
		const [state3] = await collectStates(engine, 1);
		expect(state3.timeSig).toBe("3/4");
	});

	test("resolves current lyric, chord, and section", async () => {
		engine = new SyncEngine(10);
		const adapter = new MockAdapter();
		const map = makeMap({
			lyrics: [
				{ t: 0, text: "First line", end: 2000 },
				{ t: 3000, text: "Second line", end: 5000 },
			],
			chords: [
				{ t: 0, chord: "C", end: 2000 },
				{ t: 2000, chord: "G", end: 4000 },
			],
			sections: [{ t: 0, type: "verse", end: 5000 }],
		});

		adapter.position = 1000;
		const collected = collectStates(engine, 1);
		engine.attach(adapter, map);
		const [state] = await collected;

		expect(state.currentLyric?.text).toBe("First line");
		expect(state.currentChord?.chord).toBe("C");
		expect(state.currentSection?.type).toBe("verse");
	});

	test("resets carry-forward state on detach and reattach", async () => {
		engine = new SyncEngine(10);
		const adapter = new MockAdapter();
		const map = makeMap({
			beats: [{ t: 0, downbeat: true, bpm: 120 }],
		});

		adapter.position = 100;
		const collected = collectStates(engine, 1);
		engine.attach(adapter, map);
		const [state1] = await collected;
		expect(state1.bpm).toBe(120);

		engine.detach();

		// Reattach with a map that has no bpm on any beat
		const map2 = makeMap({
			beats: [{ t: 0, downbeat: true }],
		});
		adapter.position = 100;
		const collected2 = collectStates(engine, 1);
		engine.attach(adapter, map2);
		const [state2] = await collected2;

		expect(state2.bpm).toBeNull();
	});
});
