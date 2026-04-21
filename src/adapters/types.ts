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
	isPlaying(): boolean;
	destroy(): void;
}
