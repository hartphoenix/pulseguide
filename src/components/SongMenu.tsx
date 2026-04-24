import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

type SortKey = "title" | "artist";

export function SongMenu() {
	const [maps, setMaps] = useState<MapEntry[]>([]);
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortAsc, setSortAsc] = useState(true);

	useEffect(() => {
		fetch("/maps/manifest.json")
			.then((res) => res.json())
			.then((data: MapEntry[]) => setMaps(data))
			.catch(() => {});
	}, []);

	function handleSort(key: SortKey) {
		if (key === sortKey) {
			setSortAsc((a) => !a);
		} else {
			setSortKey(key);
			setSortAsc(true);
		}
	}

	const sorted = [...maps].sort((a, b) => {
		const av = a[sortKey].toLowerCase();
		const bv = b[sortKey].toLowerCase();
		const cmp = av < bv ? -1 : av > bv ? 1 : 0;
		return sortAsc ? cmp : -cmp;
	});

	const arrow = sortAsc ? " ▲" : " ▼";

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "#0a0a0a",
				color: "#ddd",
				padding: "40px 20px",
			}}
		>
			<div style={{ maxWidth: 640, margin: "0 auto" }}>
				<h1
					style={{
						fontSize: 28,
						fontWeight: 700,
						marginBottom: 4,
					}}
				>
					PulseGuide
				</h1>
				<p style={{ color: "#888", fontSize: 14, marginBottom: 32 }}>
					{maps.length} {maps.length === 1 ? "song" : "songs"} mapped
				</p>

				{maps.length === 0 ? (
					<p style={{ color: "#555" }}>Loading...</p>
				) : (
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: 16,
						}}
					>
						<thead>
							<tr style={{ borderBottom: "1px solid #333" }}>
								<th
									onClick={() => handleSort("title")}
									style={{
										textAlign: "left",
										padding: "10px 8px",
										cursor: "pointer",
										fontWeight: 600,
										color: sortKey === "title" ? "#ddd" : "#888",
										userSelect: "none",
									}}
								>
									Title{sortKey === "title" && arrow}
								</th>
								<th
									onClick={() => handleSort("artist")}
									style={{
										textAlign: "left",
										padding: "10px 8px",
										cursor: "pointer",
										fontWeight: 600,
										color: sortKey === "artist" ? "#ddd" : "#888",
										userSelect: "none",
									}}
								>
									Artist{sortKey === "artist" && arrow}
								</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((m) => (
								<tr key={m.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
									<td style={{ padding: 0 }}>
										<Link
											to={`/song/${m.id}`}
											style={{
												display: "block",
												padding: "10px 8px",
												color: "#ddd",
												textDecoration: "none",
											}}
										>
											{m.title}
										</Link>
									</td>
									<td style={{ padding: 0 }}>
										<Link
											to={`/song/${m.id}`}
											style={{
												display: "block",
												padding: "10px 8px",
												color: "#999",
												textDecoration: "none",
											}}
										>
											{m.artist}
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
