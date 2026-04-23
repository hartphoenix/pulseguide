import { useEffect, useRef } from "react";
import type { BeatEvent, ChordEvent, LyricLine, Section, WordEvent } from "../types/pulsemap";

const SCROLL_TARGET_RATIO = 0.15;
const CHORD_WORD_TOLERANCE = 500;

type DisplayEntry =
	| { kind: "lyric"; line: LyricLine; words: WordEvent[]; chords: ChordEvent[] }
	| { kind: "chords"; chords: ChordEvent[]; t: number };

interface Measure {
	t: number;
	end: number;
	chords: ChordEvent[];
}

interface SectionGroup {
	section: Section;
	entries: DisplayEntry[];
	measures: Measure[];
}

function buildEntries(
	lyrics: LyricLine[],
	words: WordEvent[],
	chords: ChordEvent[],
): DisplayEntry[] {
	let wordCursor = 0;
	const entries: DisplayEntry[] = [];
	let chordCursor = 0;

	for (let i = 0; i < lyrics.length; i++) {
		const line = lyrics[i];
		const expectedCount = line.text.split(/\s+/).filter(Boolean).length;
		const lineWords: WordEvent[] = [];

		for (let j = 0; j < expectedCount && wordCursor < words.length; j++) {
			lineWords.push(words[wordCursor]);
			wordCursor++;
		}

		if (i < lyrics.length - 1) {
			const nextLineWords = lyrics[i + 1].text.split(/\s+/).filter(Boolean);
			const nextLineT = lyrics[i + 1].t;
			while (wordCursor < words.length && words[wordCursor].t < nextLineT) {
				const remaining = words.slice(wordCursor, wordCursor + nextLineWords.length);
				const isPickup =
					remaining.length >= nextLineWords.length &&
					nextLineWords.every((nw, idx) => remaining[idx].text.toLowerCase() === nw.toLowerCase());
				if (isPickup) break;
				lineWords.push(words[wordCursor]);
				wordCursor++;
			}
		}

		const lineStart = lineWords.length > 0 ? lineWords[0].t : line.t;
		const lineEnd =
			lineWords.length > 0
				? lineWords[lineWords.length - 1].t + CHORD_WORD_TOLERANCE
				: (line.end ?? lineStart + CHORD_WORD_TOLERANCE);

		// Collect chords before this line as a standalone chord row
		const preChords: ChordEvent[] = [];
		while (
			chordCursor < chords.length &&
			chords[chordCursor].t < lineStart - CHORD_WORD_TOLERANCE
		) {
			preChords.push(chords[chordCursor]);
			chordCursor++;
		}
		if (preChords.length > 0) {
			entries.push({ kind: "chords", chords: preChords, t: preChords[0].t });
		}

		// Collect chords that belong with this line (close to a word)
		const lineChords: ChordEvent[] = [];
		while (chordCursor < chords.length && chords[chordCursor].t <= lineEnd) {
			lineChords.push(chords[chordCursor]);
			chordCursor++;
		}

		entries.push({ kind: "lyric", line, words: lineWords, chords: lineChords });
	}

	// Remaining chords after last lyric
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

function buildMeasures(beats: BeatEvent[], start: number, end: number): Measure[] {
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

function groupBySection(
	entries: DisplayEntry[],
	sections: Section[],
	beats: BeatEvent[],
): SectionGroup[] {
	if (!sections.length) {
		return [{ section: { t: 0, type: "", end: Number.POSITIVE_INFINITY }, entries, measures: [] }];
	}

	return sections.map((section) => {
		const sectionEntries = entries.filter((e) => {
			const t = e.kind === "lyric" ? (e.words.length > 0 ? e.words[0].t : e.line.t) : e.t;
			return t >= section.t && t < section.end;
		});

		const hasLyrics = sectionEntries.some((e) => e.kind === "lyric");
		let measures: Measure[] = [];
		if (!hasLyrics && sectionEntries.length === 0) {
			const sectionChords = sectionEntries.filter((e) => e.kind === "chords");
			if (sectionChords.length === 0) {
				measures = buildMeasures(beats, section.t, section.end);
			}
		}

		return { section, entries: sectionEntries, measures };
	});
}

function formatSectionLabel(section: Section): string {
	if (section.label) return section.label;
	if (section.type && section.type !== "section") {
		return section.type.charAt(0).toUpperCase() + section.type.slice(1);
	}
	return "";
}

function findChordForWord(word: WordEvent, lineChords: ChordEvent[]): ChordEvent | null {
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

function ChordRow({
	chords,
	position,
	onSeek,
}: {
	chords: ChordEvent[];
	position: number;
	onSeek: (ms: number) => void;
}) {
	return (
		<div
			style={{
				padding: "6px 0",
				fontSize: 15,
				fontWeight: 600,
				color: "#e8b84b",
				cursor: "pointer",
			}}
		>
			{chords.map((c) => {
				const isActive = position >= c.t && position < (c.end ?? c.t + 2000);
				return (
					<span
						key={c.t}
						onClick={() => onSeek(c.t)}
						style={{
							marginRight: 16,
							opacity: isActive ? 1 : 0.7,
							transition: "opacity 0.15s",
						}}
					>
						{c.chord}
					</span>
				);
			})}
		</div>
	);
}

function MeasureChart({
	measures,
	position,
	onSeek,
}: {
	measures: Measure[];
	position: number;
	onSeek: (ms: number) => void;
}) {
	if (!measures.length) return null;

	const MEASURES_PER_ROW = 4;
	const rows: Measure[][] = [];
	for (let i = 0; i < measures.length; i += MEASURES_PER_ROW) {
		rows.push(measures.slice(i, i + MEASURES_PER_ROW));
	}

	return (
		<div style={{ padding: "4px 0" }}>
			{rows.map((row) => (
				<div
					key={row[0].t}
					style={{ display: "flex", fontFamily: "inherit", fontSize: 16, lineHeight: 1.8 }}
				>
					{row.map((measure, idx) => {
						const isActive = position >= measure.t && position < measure.end;
						const chordText =
							measure.chords.length > 0 ? measure.chords.map((c) => c.chord).join("  ") : "";
						return (
							<div
								key={measure.t}
								onClick={() => onSeek(measure.t)}
								style={{
									flex: 1,
									padding: "2px 6px",
									cursor: "pointer",
									borderLeft: "1px solid #333",
									borderRight: idx === row.length - 1 ? "1px solid #333" : "none",
									color: isActive ? "#e8b84b" : "#777",
									fontWeight: isActive ? 600 : 400,
									transition: "color 0.15s",
								}}
							>
								{chordText || <span style={{ color: "#333" }}>{"/ ".repeat(3).trim()}</span>}
							</div>
						);
					})}
				</div>
			))}
		</div>
	);
}

function ChordWordLine({
	entry,
	activeLineT,
	activeWordT,
	onSeek,
	lineRef,
}: {
	entry: Extract<DisplayEntry, { kind: "lyric" }>;
	activeLineT: number | null;
	activeWordT: number | null;
	onSeek: (ms: number) => void;
	lineRef: React.Ref<HTMLDivElement> | undefined;
}) {
	const isActiveLine = entry.line.t === activeLineT;
	const hasChords = entry.chords.length > 0;
	const hasWords = entry.words.length > 0;

	if (!hasWords) {
		return (
			<div ref={lineRef} style={{ paddingTop: hasChords ? 22 : 0 }}>
				{hasChords && (
					<div style={{ fontSize: 14, color: "#e8b84b", fontWeight: 600, marginBottom: 2 }}>
						{entry.chords.map((c) => c.chord).join("  ")}
					</div>
				)}
				<button
					type="button"
					onClick={() => onSeek(entry.line.t)}
					style={{
						display: "block",
						width: "100%",
						textAlign: "left",
						padding: "4px 0",
						fontSize: 20,
						lineHeight: 1.6,
						cursor: "pointer",
						color: isActiveLine ? "#fff" : "#999",
						fontWeight: isActiveLine ? 600 : 400,
						transition: "color 0.15s",
						background: "none",
						border: "none",
						fontFamily: "inherit",
					}}
				>
					{entry.line.text}
				</button>
			</div>
		);
	}

	const usedChords = new Set<ChordEvent>();

	return (
		<div
			ref={lineRef}
			onClick={() => onSeek(entry.line.t)}
			onKeyDown={(e) => e.key === "Enter" && onSeek(entry.line.t)}
			role="button"
			tabIndex={0}
			style={{
				padding: "4px 0",
				paddingTop: hasChords ? 22 : 4,
				position: "relative",
				cursor: "pointer",
				fontSize: 20,
				lineHeight: 1.6,
				background: "none",
				border: "none",
			}}
		>
			{entry.words.map((word, wordIdx) => {
				const chord = findChordForWord(word, entry.chords);
				const isActiveWord = word.t === activeWordT;
				const showChord = chord && !usedChords.has(chord);
				if (chord) usedChords.add(chord);

				const isLastWord = wordIdx === entry.words.length - 1;

				return (
					<span
						key={`w-${entry.line.t}-${wordIdx}`}
						onClick={(e) => {
							e.stopPropagation();
							onSeek(word.t);
						}}
						style={{
							position: "relative",
							display: "inline",
							cursor: "pointer",
							color: isActiveWord ? "#fff" : isActiveLine ? "#ccc" : "#999",
							fontWeight: isActiveWord ? 700 : isActiveLine ? 500 : 400,
							transition: "color 0.1s, font-weight 0.1s",
						}}
					>
						{showChord && (
							<span
								style={{
									position: "absolute",
									top: -20,
									left: 0,
									fontSize: 14,
									fontWeight: 600,
									color: "#e8b84b",
									whiteSpace: "nowrap",
									pointerEvents: "none",
								}}
							>
								{chord.chord}
							</span>
						)}
						{word.text}
						{!isLastWord && " "}
					</span>
				);
			})}
		</div>
	);
}

function SectionBlock({
	group,
	activeLineT,
	activeWordT,
	activeSection,
	position,
	onSeek,
	activeRef,
}: {
	group: SectionGroup;
	activeLineT: number | null;
	activeWordT: number | null;
	activeSection: Section | null;
	position: number;
	onSeek: (ms: number) => void;
	activeRef: React.RefObject<HTMLDivElement | null>;
}) {
	const label = formatSectionLabel(group.section);
	const isActiveSection = activeSection?.t === group.section.t;
	const hasEntries = group.entries.length > 0;
	const hasMeasures = group.measures.length > 0;

	return (
		<div
			style={{
				display: "flex",
				gap: 16,
				marginBottom: hasEntries || hasMeasures ? 20 : 12,
			}}
		>
			<div
				style={{
					width: 80,
					flexShrink: 0,
					paddingTop: 6,
					fontSize: 13,
					fontWeight: 500,
					color: isActiveSection ? "#6ba3d6" : "#555",
					transition: "color 0.2s",
					textAlign: "right",
					userSelect: "none",
				}}
			>
				{label}
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				{group.entries.map((entry) => {
					if (entry.kind === "chords") {
						return (
							<ChordRow
								key={`cr-${entry.t}`}
								chords={entry.chords}
								position={position}
								onSeek={onSeek}
							/>
						);
					}
					const isActive = entry.line.t === activeLineT;
					return (
						<ChordWordLine
							key={entry.line.t}
							entry={entry}
							activeLineT={activeLineT}
							activeWordT={activeWordT}
							onSeek={onSeek}
							lineRef={isActive ? activeRef : undefined}
						/>
					);
				})}
				{hasMeasures && (
					<MeasureChart measures={group.measures} position={position} onSeek={onSeek} />
				)}
				{!hasEntries && !hasMeasures && (
					<div style={{ padding: "8px 0", fontSize: 14, color: "#444", fontStyle: "italic" }}>
						{group.section.type === "solo"
							? "Solo"
							: group.section.type === "intro"
								? "Intro"
								: group.section.type === "outro"
									? "Outro"
									: "Instrumental"}
					</div>
				)}
			</div>
		</div>
	);
}

export function LyricsChordDisplay({
	lyrics,
	words,
	chords,
	sections,
	beats,
	activeLineT,
	activeWordT,
	activeSection,
	position,
	onSeek,
}: {
	lyrics: LyricLine[];
	words: WordEvent[];
	chords: ChordEvent[];
	sections: Section[];
	beats: BeatEvent[];
	activeLineT: number | null;
	activeWordT: number | null;
	activeSection: Section | null;
	position: number;
	onSeek: (ms: number) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const activeRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!activeRef.current || !containerRef.current) return;

		const container = containerRef.current;
		const active = activeRef.current;
		const containerRect = container.getBoundingClientRect();
		const activeRect = active.getBoundingClientRect();

		const targetOffset = containerRect.height * SCROLL_TARGET_RATIO;
		const activeRelativeTop = activeRect.top - containerRect.top + container.scrollTop;
		const targetScroll = activeRelativeTop - targetOffset;

		const maxScroll = container.scrollHeight - container.clientHeight;
		const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll));

		container.scrollTo({ top: clampedScroll, behavior: "smooth" });
	}, [activeLineT]);

	const entries = buildEntries(lyrics, words, chords);
	const groups = groupBySection(entries, sections, beats);

	if (!lyrics.length && !chords.length) {
		return <div style={{ padding: 16, color: "#888" }}>No lyrics or chords in this map.</div>;
	}

	return (
		<div
			ref={containerRef}
			style={{
				flex: 1,
				overflow: "auto",
				padding: "24px 12px",
				WebkitOverflowScrolling: "touch",
			}}
		>
			<div style={{ maxWidth: 720, margin: "0 auto" }}>
				{groups.map((group) => (
					<SectionBlock
						key={group.section.t}
						group={group}
						activeLineT={activeLineT}
						activeWordT={activeWordT}
						activeSection={activeSection}
						position={position}
						onSeek={onSeek}
						activeRef={activeRef}
					/>
				))}
			</div>
		</div>
	);
}
