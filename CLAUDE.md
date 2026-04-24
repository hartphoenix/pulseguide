## PulseGuide

Demo player for the PulseMap protocol. Web app that displays a
synced lead sheet (lyrics with word-level highlighting, chords above
words, section labels, measure charts for instrumental passages) for
any mapped song with interactive playback control.

### Repo structure

```
src/
  adapters/          # Re-exports from pulsemap SDK (PlaybackAdapter, YouTubeEmbedAdapter)
  components/        # React display components
    LyricsChordDisplay.tsx  # Lead sheet: lyrics + chords + sections + measures
    VideoPlayer.tsx         # YouTube embed with expanded/minimized modes
    PlaybackControls.tsx    # Seek, play/pause, speed, volume, mute
    MapLoader.tsx           # Demo map dropdown + file picker
    DebugPanel.tsx          # Dev: raw sync state display
  hooks/             # useMediaQuery for responsive layout
  sync/              # SyncEngine (polls adapter, resolves map events)
  types/             # Re-exports from pulsemap/schema
extension/           # Chrome Manifest v3 extension (Phase 4)
vite.config.ts       # Includes dev plugin to serve maps from pulsemap repo
```

### Tech stack

- **Runtime:** Bun
- **Framework:** React 19 + TypeScript + Vite
- **Linting:** Biome
- **Testing:** bun:test
- **Protocol dependency:** `pulsemap` via `github:hartphoenix/pulsemap`
- **Extension:** Chrome Manifest v3 (Phase 4)

### Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (serves maps from ../pulsemap/maps/)
bun run build        # Production build
bun test             # Run tests
bun run lint         # Lint (check only)
bun run lint:fix     # Lint and auto-fix
bun run typecheck    # TypeScript type checking
```

### Local development with pulsemap

For local development on both repos simultaneously, symlink pulsemap
into node_modules so changes are reflected immediately:

```bash
rm -rf node_modules/pulsemap
ln -s /path/to/pulsemap node_modules/pulsemap
```

The `package.json` dependency (`github:hartphoenix/pulsemap`) is what
consumers get when they clone and install. The symlink overrides it
for local dev only.

The Vite dev plugin in `vite.config.ts` serves map JSON files from
`../pulsemap/maps/` and auto-generates a manifest at
`/maps/manifest.json`. This is dev-only — production map serving is
not yet implemented.

### Conventions

- **Workflow:** Feature branches → PR → squash merge to main.
  Never commit directly to main.
- **Commits:** Meaningful messages, commit working states frequently.
- **PRs:** One logical change per PR. Keep them small and focused.
- **Tests:** Add tests when behavior matters. Use bun:test.
- **Types:** Import protocol types from `pulsemap/schema`, adapter
  types from `pulsemap/sdk`. Local re-exports in `src/types/` and
  `src/adapters/` provide a single import path for the codebase.

### Architecture

**Adapters** (from pulsemap SDK) wrap platform-specific APIs behind
`PlaybackAdapter`. The SDK provides the interface, URL matching via
`AdapterMatcher` + `createRegistry()`, and reference implementations.
Pulseguide consumes `YouTubeEmbedAdapter` from the SDK.

**SyncEngine** polls the active adapter at 50ms, resolves the current
lyric line, word, chord, section, and beat from the map, and emits
`SyncState` to subscribers. BPM and time signature are sparse change
events — the engine carries forward the last-seen value.

**LyricsChordDisplay** renders the lead sheet. Key design decisions:

- **Word-to-line alignment uses text + timestamp proximity**, not
  sequential cursor consumption. For each lyric line, the component
  scans the full `words[]` array for a word sequence matching the
  line's text that is closest in time to the line's `t`. This handles
  vocal repeats (far-away match loses to close match), pickup words
  (near the line's `t`), and ad-libs (non-matching text is skipped).
  Earlier approaches using sequential cursors failed on edge cases.

- **Chord boundaries use `line.t`** (the phrase's canonical position
  in the song), not the first word's timestamp. Lyric line `end`
  timestamps from upstream sources can extend far past the actual
  lyrics (to the next line's start), which swallows instrumental
  breaks. Using `line.t` prevents this.

- **Words only highlight when their parent line is active.** The
  sync engine tracks the current word from the flat `words[]` array
  by timestamp. Without the parent-line check, vocal repeats would
  cause words on a future lyric line to highlight prematurely
  (because the repeated word's timestamp matches).

- **Chords in measure cells highlight on chord timestamp**, not
  measure boundary. The bar structure shows where chords belong
  metrically; the highlight shows when they're actually struck
  (which may be slightly before the downbeat for syncopated changes).

- **Standalone chord rows** for chords that don't fall near any
  lyric line. Large groups (>6 chords) render as measure charts
  with bar lines from beat downbeat data. Small groups render as
  an inline row.

**VideoPlayer** has expanded and minimized modes. The YouTube iframe
stays mounted in the DOM at all times (positioned offscreen when
minimized) so the API remains functional. The component must always
render in the same position in the React tree — moving it between
conditional branches causes React to remount it, destroying the
iframe and breaking playback.

### Biome rule overrides

Several rules are downgraded to warnings in `biome.json`:

- `useExhaustiveDependencies` — biome incorrectly flags destructured
  props as "outer scope values" in useEffect dependencies. Our scroll
  effects genuinely need to re-trigger when the active line changes.
- `noArrayIndexKey` — word indices within a line are used in compound
  keys (`w-{lineT}-{idx}`). The word list is static per map and never
  reorders during playback, so index-based keys are stable.
- `useSemanticElements`, `noStaticElementInteractions`,
  `useKeyWithClickEvents` — lyric word spans have click handlers for
  word-level seek. The parent line element handles keyboard
  accessibility; individual word clicks are a mouse-only precision
  refinement.
