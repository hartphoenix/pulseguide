import { useEffect, useRef } from "react";
import {
	buildEntries,
	buildMeasures,
	type DisplayEntry,
	findChordForWord,
	formatSectionLabel,
	groupBySection,
	type Measure,
	type SectionGroup,
} from "../display/layout";
import type { BeatEvent, ChordEvent, LyricLine, Section, WordEvent } from "../types/pulsemap";

// Active line sits at 15% from top of scroll container (Hart specified 10-20%).
const SCROLL_TARGET_RATIO = 0.15;

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
				display: "flex",
				flexWrap: "wrap",
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
						const measureActive = position >= measure.t && position < measure.end;
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
								}}
							>
								{measure.chords.length > 0 ? (
									measure.chords.map((c) => {
										const chordActive = position >= c.t && position < (c.end ?? measure.end);
										return (
											<span
												key={c.t}
												style={{
													color: chordActive ? "#e8b84b" : "#777",
													fontWeight: chordActive ? 600 : 400,
													transition: "color 0.1s",
													marginRight: 8,
												}}
											>
												{c.chord}
											</span>
										);
									})
								) : (
									<span style={{ color: measureActive ? "#555" : "#333" }}>
										{"/ ".repeat(3).trim()}
									</span>
								)}
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
				const isActiveWord = isActiveLine && word.t === activeWordT;
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

// Chord groups larger than this render as measure charts with bar lines; smaller groups
// render as an inline row. 6 chords fit comfortably on one line.
const MEASURE_CHART_THRESHOLD = 6;

function renderChordEntry(
	entry: Extract<DisplayEntry, { kind: "chords" }>,
	position: number,
	onSeek: (ms: number) => void,
	beats: BeatEvent[],
) {
	if (entry.chords.length <= MEASURE_CHART_THRESHOLD) {
		return (
			<ChordRow key={`cr-${entry.t}`} chords={entry.chords} position={position} onSeek={onSeek} />
		);
	}
	const start = entry.chords[0].t;
	const end =
		entry.chords[entry.chords.length - 1].end ?? entry.chords[entry.chords.length - 1].t + 5000;
	const measures = buildMeasures(beats, start, end);
	for (const chord of entry.chords) {
		const measure = measures.find((m) => chord.t >= m.t && chord.t < m.end);
		if (measure) measure.chords.push(chord);
	}
	return (
		<MeasureChart key={`mc-${entry.t}`} measures={measures} position={position} onSeek={onSeek} />
	);
}

function SectionBlock({
	group,
	activeLineT,
	activeWordT,
	activeSection,
	position,
	beats,
	onSeek,
	activeRef,
}: {
	group: SectionGroup;
	activeLineT: number | null;
	activeWordT: number | null;
	activeSection: Section | null;
	position: number;
	beats: BeatEvent[];
	onSeek: (ms: number) => void;
	activeRef: React.RefObject<HTMLDivElement | null>;
}) {
	const label = formatSectionLabel(group.section);
	const isActiveSection = activeSection?.t === group.section.t;
	const hasEntries = group.entries.length > 0;

	return (
		<div
			style={{
				display: "flex",
				gap: 16,
				marginBottom: hasEntries ? 20 : 12,
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
						return renderChordEntry(entry, position, onSeek, beats);
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
				{!hasEntries && (
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
	const groups = groupBySection(entries, sections);

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
						beats={beats}
						onSeek={onSeek}
						activeRef={activeRef}
					/>
				))}
			</div>
		</div>
	);
}
