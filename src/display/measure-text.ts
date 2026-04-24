let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D {
	if (!ctx) {
		canvas = document.createElement("canvas");
		ctx = canvas.getContext("2d")!;
	}
	return ctx;
}

export function measureTextWidth(text: string, font: string): number {
	const c = getContext();
	c.font = font;
	return c.measureText(text).width;
}

// Returns the pixel offset of each word's left edge in an inline text run.
export function wordOffsets(words: string[], font: string): number[] {
	const c = getContext();
	c.font = font;
	const offsets: number[] = [];
	let cursor = 0;
	for (let i = 0; i < words.length; i++) {
		offsets.push(cursor);
		cursor += c.measureText(words[i]).width;
		if (i < words.length - 1) {
			cursor += c.measureText(" ").width;
		}
	}
	return offsets;
}
