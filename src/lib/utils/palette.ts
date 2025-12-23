
type Triple = [number, number, number]

export class ColorSuggestions {
    private readonly colorThief = new ColorThief();
    private readonly NO_OF_COLORS = 5;

    private dominantHsl: Triple;
    private paletteHsl: Triple[] = [];

    constructor(img: any) {
        this.dominantHsl = this.rgbToHsl(this.colorThief.getColor(img));
        this.paletteHsl = this.colorThief.getPalette(img, this.NO_OF_COLORS).map((rgb: Triple) => this.rgbToHsl(rgb));
    }

    public getNoOfColors(): number { return this.NO_OF_COLORS; }

    private rgbToHsl(color: Triple): Triple {
        let [r, g, b] = color;

        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return [h, s, l];
    }

    private hslToHex(hsl: Triple): string {
        let [h, s, l] = hsl;

        l /= 1; // keep l in 0–1
        const a = s * Math.min(l, 1 - l);

        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color)
                .toString(16)
                .padStart(2, '0');
        };

        return `#${f(0)}${f(8)}${f(4)}`;
    }

    private rgbToHex(color: Triple) {
        let [r, g, b] = color;

        return (
            '#' +
            [r, g, b]
                .map(v => {
                    const hex = v.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                })
                .join('')
        );
    }

    private higherContrastHsl(color: Triple): Triple {
        const [h, s, l] = color;

        const newL = l > 0.5 ? l - 0.35 : l + 0.35;
        const newS = Math.min(s + 0.2, 1);

        return [h, newS, Math.max(0.1, Math.min(newL, 0.9))];
    }

    public getSuggestedColors(): string[][] {
        let colors: string[][] = [];

        let getCrazyColorSet = (hsl: Triple) => {
            let colorsForHsl: string[] = [];

            colorsForHsl.push(this.crazyTextColor(hsl));
            colorsForHsl.push(...this.crazyGradient(hsl));

            return colorsForHsl;
        }

        for (let i = 0; i < this.NO_OF_COLORS; i++) {
            let hsl = this.higherContrastHsl(this.paletteHsl[i]);
            //colors.push(getCrazyColorSet(hsl));         
            colors.push(getCrazyColorSet(this.complementaryHsl(hsl)));         
        }

        colors.push(getCrazyColorSet(this.dominantHsl));

        return colors;
    }

    public complementaryHsl(colorHsl: Triple): Triple {
        const [h, s, l] = colorHsl;
        return [(h + 180) % 360, s, l];
    }

    public complementaryHex(colorHsl: Triple): string {
        return this.hslToHex(this.complementaryHsl(colorHsl));
    }

    public textColorHex(colorHsl: Triple): string {
        const [h, s, l] = colorHsl;
        return this.hslToHex([h, Math.min(s, 0.6), Math.max(l, 0.4)]);
    }

    private crazyTextColor(color: Triple): string {
        let [h, s, l] = color;

        const newH = (h + 20) % 360;
        const newS = Math.min(1, s + 0.3);
        const newL = l > 0.5 ? 0.15 : 0.85;

        return this.hslToHex([newH, newS, newL]);
    }

    private crazyGradient(color: Triple): string[] {
        let [h, s, l] = color;

        const h1 = (h + 40) % 360;
        const h2 = (h - 60 + 360) % 360;

        const s1 = Math.min(1, s + 0.2);
        const s2 = Math.min(1, s + 0.1);

        const l1 = Math.min(0.85, l + 0.25);
        const l2 = Math.max(0.15, l - 0.25);

        return [
            this.hslToHex([h1, s1, l1]),
            this.hslToHex([h2, s2, l2])
        ];
    }

}