declare namespace YT {
	enum PlayerState {
		UNSTARTED = -1,
		ENDED = 0,
		PLAYING = 1,
		PAUSED = 2,
		BUFFERING = 3,
		CUED = 5,
	}

	interface PlayerOptions {
		width?: number | string;
		height?: number | string;
		videoId?: string;
		playerVars?: Record<string, unknown>;
		events?: {
			onReady?: (event: { target: Player }) => void;
			onStateChange?: (event: { data: PlayerState }) => void;
			onError?: (event: { data: number }) => void;
		};
	}

	class Player {
		constructor(elementId: string | HTMLElement, options: PlayerOptions);
		playVideo(): void;
		pauseVideo(): void;
		seekTo(seconds: number, allowSeekAhead?: boolean): void;
		getCurrentTime(): number;
		getDuration(): number;
		getPlayerState(): PlayerState;
		setPlaybackRate(rate: number): void;
		getPlaybackRate(): number;
		getAvailablePlaybackRates(): number[];
		getVolume(): number;
		setVolume(volume: number): void;
		isMuted(): boolean;
		mute(): void;
		unMute(): void;
		getVideoData(): { video_id: string; title: string; author: string };
		destroy(): void;
	}
}

interface Window {
	onYouTubeIframeAPIReady?: () => void;
	YT?: typeof YT;
}
