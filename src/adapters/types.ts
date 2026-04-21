export interface PlaybackAdapter {
	readonly platform: string;
	canHandle(url: string): boolean;
	getPosition(): number;
	setPosition(ms: number): void;
	seek(ms: number): void;
	play(): void;
	pause(): void;
	setPlaybackRate(rate: number): void;
	getPlaybackRate(): number;
	getVolume(): number;
	setVolume(level: number): void;
	isMuted(): boolean;
	setMuted(muted: boolean): void;
	isPlaying(): boolean;
	destroy(): void;
}
