import { describe, expect, test } from "bun:test";
import {
	formatDuration,
	formatRecordingLabel,
	formatShortDate,
	formatTimeOfDay,
} from "../../src/recording/format";

describe("formatDuration", () => {
	test("formats minutes and zero-padded seconds", () => {
		expect(formatDuration(125000)).toBe("2m05s");
		expect(formatDuration(45000)).toBe("0m45s");
		expect(formatDuration(60000)).toBe("1m00s");
		expect(formatDuration(0)).toBe("0m00s");
		expect(formatDuration(605000)).toBe("10m05s");
	});

	test("clamps negative input to zero", () => {
		expect(formatDuration(-1000)).toBe("0m00s");
	});
});

describe("formatTimeOfDay", () => {
	test("uses 12-hour clock with a/p suffix", () => {
		expect(formatTimeOfDay(new Date(2026, 3, 29, 12, 34))).toBe("12:34p");
		expect(formatTimeOfDay(new Date(2026, 3, 29, 0, 0))).toBe("12:00a");
		expect(formatTimeOfDay(new Date(2026, 3, 29, 9, 5))).toBe("9:05a");
		expect(formatTimeOfDay(new Date(2026, 3, 29, 23, 59))).toBe("11:59p");
		expect(formatTimeOfDay(new Date(2026, 3, 29, 12, 0))).toBe("12:00p");
		expect(formatTimeOfDay(new Date(2026, 3, 29, 1, 0))).toBe("1:00a");
		expect(formatTimeOfDay(new Date(2026, 3, 29, 13, 7))).toBe("1:07p");
	});
});

describe("formatShortDate", () => {
	test("formats month/day/2-digit-year, single-digit where natural", () => {
		expect(formatShortDate(new Date(2026, 3, 29))).toBe("4/29/26");
		expect(formatShortDate(new Date(2026, 0, 1))).toBe("1/1/26");
		expect(formatShortDate(new Date(2099, 11, 31))).toBe("12/31/99");
		expect(formatShortDate(new Date(2005, 4, 8))).toBe("5/8/05");
	});
});

describe("formatRecordingLabel", () => {
	test("composes duration, time, and date in the spec'd format", () => {
		expect(formatRecordingLabel(125000, new Date(2026, 3, 29, 12, 34))).toBe(
			"2m05s 12:34p 4/29/26",
		);
		expect(formatRecordingLabel(45000, new Date(2026, 3, 29, 0, 0))).toBe("0m45s 12:00a 4/29/26");
		expect(formatRecordingLabel(0, new Date(2026, 0, 1, 12, 0))).toBe("0m00s 12:00p 1/1/26");
	});
});
