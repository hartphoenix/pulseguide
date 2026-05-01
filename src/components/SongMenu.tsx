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
				background: "var(--bg-deep)",
				color: "var(--text)",
				padding: "60px 24px",
			}}
		>
			<div style={{ maxWidth: 720, margin: "0 auto" }}>
				<h1
					style={{
						fontFamily: "var(--heading)",
						fontWeight: 300,
						fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
						letterSpacing: "-0.02em",
						lineHeight: 1.1,
						textTransform: "lowercase",
						margin: "0 0 8px",
						background: "linear-gradient(135deg, #e8c070 0%, #d4a050 40%, #c48a40 80%)",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						backgroundClip: "text",
					}}
				>
					pulseguide
				</h1>
				<p
					style={{
						color: "var(--text-muted)",
						fontSize: 14,
						marginBottom: 36,
					}}
				>
					{maps.length} {maps.length === 1 ? "song" : "songs"} mapped
				</p>

				{maps.length === 0 ? (
					<p style={{ color: "var(--text-muted)" }}>Loading…</p>
				) : (
					<table
						style={{
							width: "100%",
							borderCollapse: "collapse",
							fontSize: 16,
						}}
					>
						<thead>
							<tr style={{ borderBottom: "1px solid var(--border)" }}>
								<th
									onClick={() => handleSort("title")}
									style={{
										textAlign: "left",
										padding: "10px 8px",
										cursor: "pointer",
										fontFamily: "var(--heading)",
										fontWeight: 500,
										letterSpacing: "0.04em",
										textTransform: "lowercase",
										color: sortKey === "title" ? "var(--accent)" : "var(--text-muted)",
										userSelect: "none",
									}}
								>
									title{sortKey === "title" && arrow}
								</th>
								<th
									onClick={() => handleSort("artist")}
									style={{
										textAlign: "left",
										padding: "10px 8px",
										cursor: "pointer",
										fontFamily: "var(--heading)",
										fontWeight: 500,
										letterSpacing: "0.04em",
										textTransform: "lowercase",
										color: sortKey === "artist" ? "var(--accent)" : "var(--text-muted)",
										userSelect: "none",
									}}
								>
									artist{sortKey === "artist" && arrow}
								</th>
							</tr>
						</thead>
						<tbody>
							{sorted.map((m) => (
								<tr key={m.id} style={{ borderBottom: "1px solid rgba(42, 34, 32, 0.5)" }}>
									<td style={{ padding: 0 }}>
										<Link
											to={`/song/${m.id}`}
											style={{
												display: "block",
												padding: "10px 8px",
												color: "var(--text-h)",
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
												color: "var(--text-muted)",
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
