const ENV_BASE = import.meta.env.VITE_MAP_BASE_URL as string | undefined;
const PROD_DEFAULT = "https://hartphoenix.github.io/pulsemap";

function externalBase(): string | null {
	if (ENV_BASE) return ENV_BASE.replace(/\/$/, "");
	if (import.meta.env.PROD) return PROD_DEFAULT;
	return null;
}

export function manifestUrl(): string {
	const ext = externalBase();
	return ext ? `${ext}/manifest.json` : "/maps/manifest.json";
}

export function mapUrl(mapId: string): string {
	const ext = externalBase();
	return ext ? `${ext}/maps/${mapId}.json` : `/maps/${mapId}.json`;
}
