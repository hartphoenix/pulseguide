export function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
}

export function formatTimeOfDay(d: Date): string {
	let hours = d.getHours();
	const ampm = hours < 12 ? "a" : "p";
	hours = hours % 12;
	if (hours === 0) hours = 12;
	const minutes = d.getMinutes().toString().padStart(2, "0");
	return `${hours}:${minutes}${ampm}`;
}

export function formatShortDate(d: Date): string {
	const month = d.getMonth() + 1;
	const day = d.getDate();
	const year = d.getFullYear() % 100;
	return `${month}/${day}/${year.toString().padStart(2, "0")}`;
}

export function formatRecordingLabel(durationMs: number, createdAt: Date): string {
	return `${formatDuration(durationMs)} ${formatTimeOfDay(createdAt)} ${formatShortDate(createdAt)}`;
}
