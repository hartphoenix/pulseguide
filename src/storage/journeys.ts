import type { Journey } from "../types/journey";

const DB_NAME = "pulseguide";
const DB_VERSION = 1;
const JOURNEYS = "journeys";
const BLOBS = "audioBlobs";
const MAP_ID_INDEX = "by_map_id";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(JOURNEYS)) {
				const store = db.createObjectStore(JOURNEYS, { keyPath: "id" });
				store.createIndex(MAP_ID_INDEX, "map_id", { unique: false });
			}
			if (!db.objectStoreNames.contains(BLOBS)) {
				db.createObjectStore(BLOBS);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

function reqDone<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

// v0.1 stored `latency_compensation_ms` with subtractive math
// (effective_start = start - latency_comp). v0.2 renames to
// `playback_offset_ms` with additive math and a flipped sign
// convention (positive = later). Migrate on read.
function migrateJourney(raw: unknown): Journey {
	const r = raw as Record<string, unknown>;
	if (r.version === "0.1" && typeof r.latency_compensation_ms === "number") {
		const { latency_compensation_ms, ...rest } = r;
		return {
			...rest,
			version: "0.2",
			playback_offset_ms: -latency_compensation_ms,
		} as Journey;
	}
	return raw as Journey;
}

export async function saveJourney(journey: Journey, blob: Blob): Promise<void> {
	const db = await openDB();
	const tx = db.transaction([JOURNEYS, BLOBS], "readwrite");
	tx.objectStore(JOURNEYS).put(journey);
	tx.objectStore(BLOBS).put(blob, journey.id);
	await txDone(tx);
}

export async function listForMap(mapId: string): Promise<Journey[]> {
	const db = await openDB();
	const tx = db.transaction(JOURNEYS, "readonly");
	const idx = tx.objectStore(JOURNEYS).index(MAP_ID_INDEX);
	const raw = await reqDone(idx.getAll(mapId));
	await txDone(tx);

	const journeys: Journey[] = [];
	const needsRewrite: Journey[] = [];
	for (const r of raw) {
		const migrated = migrateJourney(r);
		journeys.push(migrated);
		if (migrated !== r) needsRewrite.push(migrated);
	}

	if (needsRewrite.length > 0) {
		const tx2 = db.transaction(JOURNEYS, "readwrite");
		const store = tx2.objectStore(JOURNEYS);
		for (const j of needsRewrite) store.put(j);
		await txDone(tx2);
	}

	return journeys.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getBlob(id: string): Promise<Blob | null> {
	const db = await openDB();
	const tx = db.transaction(BLOBS, "readonly");
	const result = await reqDone(tx.objectStore(BLOBS).get(id));
	await txDone(tx);
	return (result as Blob | undefined) ?? null;
}

export async function deleteJourney(id: string): Promise<void> {
	const db = await openDB();
	const tx = db.transaction([JOURNEYS, BLOBS], "readwrite");
	tx.objectStore(JOURNEYS).delete(id);
	tx.objectStore(BLOBS).delete(id);
	await txDone(tx);
}

export async function updateJourney(id: string, patch: Partial<Journey>): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(JOURNEYS, "readwrite");
	const store = tx.objectStore(JOURNEYS);
	const raw = await reqDone(store.get(id));
	if (!raw) {
		await txDone(tx);
		return;
	}
	const existing = migrateJourney(raw);
	store.put({ ...existing, ...patch, id });
	await txDone(tx);
}
