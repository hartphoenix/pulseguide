import { useRef } from "react";
import type { PulseMap } from "../types/pulsemap";

const DEMO_MAPS = [
	{ label: "Bohemian Rhapsody — Queen", path: "/maps/bohemian-rhapsody.json" },
	{ label: "The Keys — Matt Duncan", path: "/maps/the-keys.json" },
];

export function MapLoader({
	onMapLoaded,
}: {
	onMapLoaded: (map: PulseMap, source: string) => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);

	async function handleFile(file: File) {
		const text = await file.text();
		const map = JSON.parse(text) as PulseMap;
		onMapLoaded(map, file.name);
	}

	async function handleDemoSelect(path: string) {
		if (!path) return;
		const res = await fetch(path);
		const map = (await res.json()) as PulseMap;
		onMapLoaded(map, path.split("/").pop()!);
	}

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
			<select
				onChange={(e) => handleDemoSelect(e.target.value)}
				defaultValue=""
				style={{ padding: 4 }}
			>
				<option value="" disabled>
					Demo maps...
				</option>
				{DEMO_MAPS.map((m) => (
					<option key={m.path} value={m.path}>
						{m.label}
					</option>
				))}
			</select>
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
