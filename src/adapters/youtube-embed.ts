import type { PlaybackAdapter } from "./types";

let apiLoaded = false;
let apiReady = false;
const apiReadyCallbacks: (() => void)[] = [];

function ensureApi(): Promise<void> {
	if (apiReady) return Promise.resolve();
	return new Promise<void>((resolve) => {
		apiReadyCallbacks.push(resolve);
		if (apiLoaded) return;
		apiLoaded = true;
		const tag = document.createElement("script");
		tag.src = "https://www.youtube.com/iframe_api";
		document.head.appendChild(tag);
		window.onYouTubeIframeAPIReady = () => {
			apiReady = true;
			for (const cb of apiReadyCallbacks) cb();
			apiReadyCallbacks.length = 0;
		};
	});
}

export function parseYouTubeVideoId(url: string): string | null {
	try {
		const u = new URL(url);
		if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
		if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
	} catch {
		// not a URL
	}
	return null;
}

export class YouTubeEmbedAdapter implements PlaybackAdapter {
	readonly platform = "youtube";
	private player: YT.Player | null = null;
	private ready = false;
	private readyPromise: Promise<void>;
	private resolveReady!: () => void;

	constructor(
		private elementId: string,
		private videoId: string,
		private onReady?: () => void,
		private onStateChange?: (state: YT.PlayerState) => void,
	) {
		this.readyPromise = new Promise<void>((resolve) => {
			this.resolveReady = resolve;
		});
		this.init();
	}

	private async init() {
		await ensureApi();
		this.player = new YT.Player(this.elementId, {
			videoId: this.videoId,
			playerVars: {
				autoplay: 0,
				controls: 1,
				modestbranding: 1,
				rel: 0,
				playsinline: 1,
			},
			events: {
				onReady: () => {
					this.ready = true;
					this.resolveReady();
					this.onReady?.();
				},
				onStateChange: (event) => {
					this.onStateChange?.(event.data);
				},
			},
		});
	}

	waitForReady(): Promise<void> {
		return this.readyPromise;
	}

	canHandle(url: string): boolean {
		return parseYouTubeVideoId(url) !== null;
	}

	getPosition(): number {
		if (!this.ready || !this.player) return 0;
		return this.player.getCurrentTime() * 1000;
	}

	setPosition(ms: number): void {
		if (!this.ready || !this.player) return;
		this.player.seekTo(ms / 1000, true);
	}

	seek(ms: number): void {
		this.setPosition(ms);
	}

	play(): void {
		if (!this.ready || !this.player) return;
		this.player.playVideo();
	}

	pause(): void {
		if (!this.ready || !this.player) return;
		this.player.pauseVideo();
	}

	setPlaybackRate(rate: number): void {
		if (!this.ready || !this.player) return;
		this.player.setPlaybackRate(rate);
	}

	getPlaybackRate(): number {
		if (!this.ready || !this.player) return 1;
		return this.player.getPlaybackRate();
	}

	getVolume(): number {
		if (!this.ready || !this.player) return 100;
		return this.player.getVolume();
	}

	setVolume(level: number): void {
		if (!this.ready || !this.player) return;
		this.player.setVolume(level);
	}

	isMuted(): boolean {
		if (!this.ready || !this.player) return false;
		return this.player.isMuted();
	}

	setMuted(muted: boolean): void {
		if (!this.ready || !this.player) return;
		if (muted) this.player.mute();
		else this.player.unMute();
	}

	isPlaying(): boolean {
		if (!this.ready || !this.player) return false;
		return this.player.getPlayerState() === YT.PlayerState.PLAYING;
	}

	getVideoTitle(): string {
		if (!this.ready || !this.player) return "";
		return this.player.getVideoData().title;
	}

	destroy(): void {
		this.player?.destroy();
		this.player = null;
		this.ready = false;
	}
}
