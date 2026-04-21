## PulseGuide

Demo player for the PulseMap protocol. Web app and Chrome extension
that displays synced lyrics, chords, and interactive playback control
for any mapped song.

### Repo structure

```
src/
  adapters/          # Playback adapter interface + implementations
  components/        # React display components (lyrics, chords, sections)
  sync/              # Sync engine (polls adapter, emits position events)
extension/           # Chrome Manifest v3 extension (Phase 4)
public/              # Static assets
.claude/             # Claude Code configuration
.github/             # CI workflows, dependabot
```

### Tech stack

- **Runtime:** Bun
- **Framework:** React 19 + TypeScript + Vite
- **Linting:** Biome
- **Testing:** bun:test
- **Extension:** Chrome Manifest v3 (Phase 4)

### Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Production build
bun test             # Run tests
bun run lint         # Lint (check only)
bun run lint:fix     # Lint and auto-fix
bun run typecheck    # TypeScript type checking
```

### Conventions

- **Workflow:** Feature branches → PR → squash merge to main.
  Never commit directly to main.
- **Commits:** Meaningful messages, commit working states frequently.
- **PRs:** One logical change per PR. Keep them small and focused.
- **Tests:** Add tests when behavior matters. Use bun:test.
- **Protocol types:** Import from the pulsemap package (or copy
  schema types until the package is published).

### Architecture

**Playback adapters** wrap platform-specific APIs behind a common
interface. The sync engine polls the active adapter for position
and emits events. Display components subscribe to position events
and render accordingly. Adapters, sync engine, and display modules
are fully decoupled.

**MVP adapters:** YouTubeEmbedAdapter (iframe API, web app + iPad),
YouTubeContentScriptAdapter (content script, extension Phase 4).

**Display modules:** LyricsDisplay, ChordDisplay (Phase 2-3).
Each module subscribes to sync engine position events independently.
