const ACCIDENTALS: [RegExp, string][] = [
	[/##/g, "×"], // double sharp: ×
	[/bb/g, "\u{1D12B}"], // double flat: 𝄫
	[/#/g, "♯"], // sharp: ♯
	[/b/g, "♭"], // flat: ♭
];

// Accidentals only appear immediately after the root letter (A-G)
// or after a slash for bass notes. Match that boundary to avoid
// mangling "dim", "mb" in "Cmb5", etc.
const ROOT_ACCIDENTAL = /^([A-G])(#{1,2}|b{1,2})/;
const BASS_ACCIDENTAL = /\/([A-G])(#{1,2}|b{1,2})/;

function replaceAccidental(match: string): string {
	for (const [pattern, replacement] of ACCIDENTALS) {
		match = match.replace(pattern, replacement);
	}
	return match;
}

export function formatChord(raw: string): string {
	let result = raw.replace(ROOT_ACCIDENTAL, (_m, root, acc) => root + replaceAccidental(acc));
	result = result.replace(BASS_ACCIDENTAL, (_m, root, acc) => `/${root}${replaceAccidental(acc)}`);
	return result;
}
