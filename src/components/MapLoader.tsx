import { useEffect, useRef, useState } from "react";
import type { PulseMap } from "../types/pulsemap";

interface MapEntry {
	file: string;
	path: string;
	id: string;
	title: string;
	artist: string;
	hasLyrics: boolean;
	hasWords: boolean;
	hasChords: boolean;
}

export function MapLoader({
	onMapLoaded,
}: {
	onMapLoaded: (map: PulseMap, source: string) => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [maps, setMaps] = useState<MapEntry[]>([]);

	useEffect(() => {
		fetch("/maps/manifest.json")
			.then((res) => res.json())
			.then((data: MapEntry[]) => setMaps(data))
			.catch(() => {});
	}, []);

	async function handleFile(file: File) {
		const text = await file.text();
		const map = JSON.parse(text) as PulseMap;
		onMapLoaded(map, file.name);
	}

	async function handleSelect(path: string) {
		if (!path) return;
		const res = await fetch(path);
		const map = (await res.json()) as PulseMap;
		const filename = path.split("/").pop() ?? path;
		onMapLoaded(map, filename);
	}

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
			{maps.length > 0 && (
				<select
					onChange={(e) => handleSelect(e.target.value)}
					defaultValue=""
					style={{ padding: 4, maxWidth: 260 }}
				>
					<option value="" disabled>
						Maps ({maps.length})...
					</option>
					{maps.map((m) => (
						<option key={m.id} value={m.path}>
							{m.title} — {m.artist}
						</option>
					))}
				</select>
			)}
			<span style={{ color: "#888" }}>or</span>
			<input
				ref={fileRef}
				id="map-file"
				type="file"
				accept=".json"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
				}}
			/>
		</div>
	);
}
