
export function decreaseHexaOpacity(hexa: string | undefined, amount = 0.2): string {
    if (!hexa) return "#fff";

    // amount: how much to reduce (0–1)
    const hex = hexa.replace("#", "");

    const rgb = hex.slice(0, 6);
    let a = parseInt(hex.slice(6, 8) ?? "FF", 16) / 255;
    if (isNaN(a)) a = 1;

    const newAlpha = Math.max(0, Math.min(1, a - amount));
    const newAlphaHex = Math.round(newAlpha * 255)
        .toString(16)
        .padStart(2, "0");

    return `#${rgb}${newAlphaHex}`;
}