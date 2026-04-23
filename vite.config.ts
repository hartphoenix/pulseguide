import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const PULSEMAP_MAPS_DIR = resolve(__dirname, "../pulsemap/maps");

function pulsemapMapsPlugin() {
	return {
		name: "pulsemap-maps",
		configureServer(server: { middlewares: { use: Function } }) {
			server.middlewares.use(async (req: { url?: string }, res: any, next: Function) => {
				if (req.url === "/maps/manifest.json") {
					try {
						const files = await readdir(PULSEMAP_MAPS_DIR);
						const maps = [];
						for (const file of files) {
							if (!file.endsWith(".json")) continue;
							const raw = await readFile(join(PULSEMAP_MAPS_DIR, file), "utf-8");
							const map = JSON.parse(raw);
							maps.push({
								file,
								path: `/maps/${file}`,
								id: map.id,
								title: map.metadata?.title ?? file,
								artist: map.metadata?.artist ?? "Unknown",
								duration_ms: map.duration_ms,
								hasLyrics: (map.lyrics?.length ?? 0) > 0,
								hasWords: (map.words?.length ?? 0) > 0,
								hasChords: (map.chords?.length ?? 0) > 0,
							});
						}
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify(maps));
					} catch {
						res.statusCode = 500;
						res.end("[]");
					}
					return;
				}

				if (req.url?.startsWith("/maps/") && req.url.endsWith(".json")) {
					const filename = req.url.slice(6);
					try {
						const data = await readFile(join(PULSEMAP_MAPS_DIR, filename), "utf-8");
						res.setHeader("Content-Type", "application/json");
						res.end(data);
					} catch {
						next();
					}
					return;
				}

				next();
			});
		},
	};
}

export default defineConfig({
	plugins: [react(), pulsemapMapsPlugin()],
});
