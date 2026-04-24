# PulseGuide

Demo player for the [PulseMap](https://github.com/hartphoenix/pulsemap) protocol — a synced lead sheet for any mapped song.

## What is PulseGuide?

PulseGuide reads PulseMap files and renders a synchronized lead sheet: lyrics with word-level highlighting, chord names above the words where they change, section labels, and measure charts for instrumental passages. Playback is controlled through the YouTube iframe API, with the display following along in real time.

### Features

- **Synced lyrics** with word-level karaoke highlighting
- **Chord-over-word alignment** — chord names positioned above the word where the change falls
- **Section labels** in the left margin (verse, chorus, bridge, etc.)
- **Measure charts** with bar lines for instrumental passages
- **Click-to-seek** at word granularity
- **Video player** with expand/minimize modes
- **Responsive layout** — portrait (book feel) and landscape (video + lyrics side by side)
- **iPad Safari** compatible

## Development

```bash
bun install
bun run dev
bun run typecheck
bun run lint
```

### Local development with pulsemap

PulseGuide depends on the [pulsemap](https://github.com/hartphoenix/pulsemap) package for protocol types and the adapter SDK. For local development on both repos:

```bash
rm -rf node_modules/pulsemap
ln -s ../pulsemap node_modules/pulsemap
```

The dev server serves map files directly from `../pulsemap/maps/`.

## License

MIT
