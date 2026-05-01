## PulseGuide

Demo player for the PulseMap protocol. Web app that displays a
synced lead sheet (lyrics with word-level highlighting, chords above
words, section labels, measure charts for instrumental passages) for
any mapped song with interactive playback control.

### Repo structure

```
src/
  main.tsx             # Entry point: BrowserRouter + route definitions
  fonts.css            # @font-face for Leland Text (chord display font)
  vite-env.d.ts        # Vite client types (CSS module support)
  adapters/            # Re-exports from pulsemap SDK (PlaybackAdapter, YouTubeEmbedAdapter)
  components/
    SongMenu.tsx         # Landing page: sortable song table (Title, Artist)
    Player.tsx           # Player view: video + controls + lead sheet for a single song
    LyricsChordDisplay.tsx  # Lead sheet: lyrics + chords + sections + measures
    VideoPlayer.tsx         # YouTube embed with expanded/minimized modes
    PlaybackControls.tsx    # Seek, play/pause, speed, volume, mute
    DebugPanel.tsx          # Dev: raw sync state display
  display/
    layout.ts            # buildEntries, alignWordsToLine, buildMeasures
    format-chord.ts      # Unicode chord formatting (# → ♯, b → ♭)
    measure-text.ts      # Canvas-based text width measurement
  hooks/               # useMediaQuery for responsive layout
  sync/                # SyncEngine (polls adapter, resolves map events)
  types/               # Re-exports from pulsemap/schema
public/
  fonts/LelandText.otf # Leland Text font (MuseScore SMuFL, SIL-licensed)
extension/             # Chrome Manifest v3 extension (Phase 4)
vite.config.ts         # Includes dev plugin to serve maps from pulsemap repo
```

### Tech stack

- **Runtime:** Bun
- **Framework:** React 19 + TypeScript + Vite
- **Routing:** react-router-dom (BrowserRouter)
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

**Routing.** Two routes: `/` renders `SongMenu` (sortable table of
all mapped songs), `/song/:mapId` renders `Player` (full player view
for one song). Each song has a stable URL using the map's UUID.
Browser back button navigates between menu and player.

**Adapters** (from pulsemap SDK) wrap platform-specific APIs behind
`PlaybackAdapter`. The SDK provides the interface, URL matching via
`AdapterMatcher` + `createRegistry()`, and reference implementations.
Pulseguide consumes `YouTubeEmbedAdapter` from the SDK.

**SyncEngine** polls the active adapter at 50ms, resolves the current
lyric line, word, chord, section, and beat from the map, and emits
`SyncState` to subscribers. BPM and time signature are sparse change
events — the engine carries forward the last-seen value.

**Chord formatting.** `formatChord()` in `src/display/format-chord.ts`
replaces ASCII accidentals with Unicode at render time (`#` → `♯`,
`b` → `♭`, `##` → `×`, `bb` → `𝄫`). Only targets accidentals after
root notes (A-G) and bass notes (after `/`); quality text like `dim`,
`sus`, `m` is untouched. Leland Text font (MuseScore SMuFL, SIL
Open Font License) is applied to all chord display elements for a
lead-sheet appearance.

**LyricsChordDisplay** renders the lead sheet. Key design decisions:

- **Word-to-line alignment uses text + timestamp proximity**, not
  sequential cursor consumption. For each lyric line, the component
  scans the full `words[]` array for a word sequence matching the
  line's text that is closest in time to the line's `t`. This handles
  vocal repeats (far-away match loses to close match), pickup words
  (near the line's `t`), and ad-libs (non-matching text is skipped).
  Earlier approaches using sequential cursors failed on edge cases.

- **Chord boundaries use `line.t`** (the phrase's canonical position
  in the song), not the first word's timestamp. LRCLIB `end`
  timestamps on lyric lines are always "next line start," not when
  the vocal actually ends — this is a known LRCLIB characteristic,
  not a bug. Using raw `end` values would swallow instrumental
  breaks. Using `line.t` prevents this. The `words` array (from
  WhisperX) is the authoritative timing source for when vocals
  actually occur.

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

**Scroll modes.** Two modes, toggled automatically:

- **Follow** (default): auto-scrolls to the active line at 15% from
  the top of the scroll container. Chord changes also drive scrolling
  via `data-chord-t` DOM attributes — during instrumental passages
  or long lyric lines, the view scrolls progressively through chord
  elements rather than parking on one position.
- **Free**: activated when the user scrolls manually during playback.
  Highlights continue updating but auto-scroll stops. A "Follow
  playback" pill button appears at center-bottom of the lyrics
  container; clicking it re-engages follow mode.

A `programmaticScroll` ref guards against auto-scroll events
triggering free mode. The guard clears after 150ms (smooth scroll
animation settle time).

**VideoPlayer** starts minimized by default. The YouTube iframe stays
mounted in the DOM at all times (positioned offscreen when minimized)
so the API remains functional. The component must always render in the
same position in the React tree — moving it between conditional
branches causes React to remount it, destroying the iframe and
breaking playback.

### Known issues

- **`bun run typecheck` fails** because the installed `pulsemap`
  package (from GitHub) is behind the local source — missing
  `WordEvent`, `PlaybackRestrictions` types and the `words` field on
  `PulseMap`. Fix: symlink local pulsemap into node_modules, or
  push the latest pulsemap schema and reinstall.

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
