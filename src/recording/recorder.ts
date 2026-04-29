/**
 * One microphone capture session. Handles getUserMedia + AudioContext
 * + MediaRecorder lifecycle, and exposes a live amplitude reading for
 * the volume-bar indicator.
 *
 * Caveat for classic Bluetooth: opening the mic forces a profile
 * switch from A2DP (high-quality output) to HFP (bidirectional, low
 * sample rate). This degrades the YT audio mid-session and is
 * unavoidable from JavaScript — no API tells us it happened, and
 * we can't prevent it. LE Audio (LC3) fixes this when both ends
 * support it. Out of MVP scope.
 */
export type RecordingStartedInfo = {
	/** Map position (ms) at the MediaRecorder.start event. */
	startMs: number;
	/** AudioContext.outputLatency * 1000 at start, OS's best guess. */
	latencyMs: number;
	mimeType: string;
};

export type RecordingResult = {
	blob: Blob;
	durationMs: number;
	mimeType: string;
};

export type RecordingSession = {
	/** Resolves when the MediaRecorder.start event fires. */
	started: Promise<RecordingStartedInfo>;
	/** Stop and finalize. Resolves once the blob is assembled. */
	stop: () => Promise<RecordingResult>;
	/** Current input amplitude as a 0..1 RMS reading. */
	amplitude: () => number;
	/** Force-release resources without producing a blob. */
	dispose: () => void;
};

export async function startRecording(getMapPosition: () => number): Promise<RecordingSession> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

	const audioContext = new AudioContext();
	const source = audioContext.createMediaStreamSource(stream);
	const analyser = audioContext.createAnalyser();
	analyser.fftSize = 1024;
	source.connect(analyser);
	const sampleBuf = new Uint8Array(analyser.fftSize);

	const mediaRecorder = new MediaRecorder(stream);
	const chunks: Blob[] = [];
	mediaRecorder.ondataavailable = (e) => {
		if (e.data && e.data.size > 0) chunks.push(e.data);
	};

	let startMs = 0;
	let stopMs = 0;
	let disposed = false;

	const started = new Promise<RecordingStartedInfo>((resolve) => {
		mediaRecorder.onstart = () => {
			startMs = getMapPosition();
			const latencyMs = (audioContext.outputLatency ?? 0) * 1000;
			resolve({ startMs, latencyMs, mimeType: mediaRecorder.mimeType });
		};
	});

	const finished = new Promise<RecordingResult>((resolve) => {
		mediaRecorder.onstop = () => {
			const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
			resolve({
				blob,
				durationMs: Math.max(0, stopMs - startMs),
				mimeType: mediaRecorder.mimeType,
			});
		};
	});

	function dispose() {
		if (disposed) return;
		disposed = true;
		for (const t of stream.getTracks()) t.stop();
		audioContext.close().catch(() => {});
	}

	mediaRecorder.start();

	return {
		started,
		amplitude: () => {
			if (disposed) return 0;
			analyser.getByteTimeDomainData(sampleBuf);
			let sumSq = 0;
			for (let i = 0; i < sampleBuf.length; i++) {
				const v = (sampleBuf[i] - 128) / 128;
				sumSq += v * v;
			}
			return Math.sqrt(sumSq / sampleBuf.length);
		},
		stop: async () => {
			stopMs = getMapPosition();
			if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
			const result = await finished;
			dispose();
			return result;
		},
		dispose,
	};
}
