import { Gradient } from "fabric";

export interface IS2PGradient {
    getStrokeStop(idx: number): string;
    getFillStop(idx: number): string;
    setStrokeStop(idx: number, color: string): void;
    setFillStop(idx: number, color: string): void;

    get strokeGradient(): Gradient<unknown, "linear">;
    get fillGradient(): Gradient<unknown, "linear">;
}

type NullOrColor = string | null;

export class S2PGradient {
    fill_: NullOrColor[] = [];
    fillGradient_?: Gradient<unknown, "linear"> = undefined;

    stroke_: NullOrColor[] = [];
    strokeGradient_?: Gradient<unknown, "linear">;

    defNullStops = [null, null];

    constructor(fill: NullOrColor[], stroke: NullOrColor[]) {
        this.fill_ = [...fill ?? this.defNullStops];
        this.stroke_ = [...stroke ?? this.defNullStops];
        if (!this.stroke_[0]) this.stroke_[0] = "#fff";
        if (!this.stroke_[1]) this.stroke_[1] = "#fff";

        this.fillGradient_ = new Gradient({
            type: "linear",
            gradientUnits: "percentage",
            coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
            colorStops: [
                { offset: 0, color: this.fill_[0] },
                { offset: 1, color: this.fill_[1] }
            ]
        });

        this.strokeGradient_ = new Gradient({
            type: "linear",
            gradientUnits: "percentage",
            coords: { x1: 0, y1: 0, x2: 1, y2: 0.5 },
            colorStops: [
                { offset: 0, color: this.stroke_[0] },
                { offset: 1, color: this.stroke_[1] }
            ]
        })
    }

    get strokeGradient(): Gradient<unknown, "linear"> { return this.strokeGradient_; }
    get fillGradient(): Gradient<unknown, "linear"> { return (!this.fill_[0] && !this.fill_[1])? null : this.fillGradient_; }

    public getStrokeStop(idx: number): string | null {
        if (idx < this.stroke_.length)
            return this.stroke_[idx] ?? null;

        return null;
    }

    public getFillStop(idx: number): string | null {
        if (idx < this.fill_.length)
            return this.fill_[idx] ?? null;

        return null;
    }

    public setStrokeStop(idx: number, color: string) {
        if (idx != 0 && idx != 1)
            return;

        this.stroke_[idx] = color;
        this.strokeGradient.colorStops[idx].color = color;

        if (!this.stroke_[1 - idx]) {
            this.stroke_[1 - idx] = color;
            this.strokeGradient_.colorStops[1 - idx].color = color;
        }
    }

    public setFillStop(idx: number, color: string) {
        if (idx != 0 && idx != 1)
            return;

        this.fill_[idx] = color;
        this.fillGradient.colorStops[idx].color = color;

        if (!this.fill_[1 - idx]) {
            this.fill_[1 - idx] = color;
            this.fillGradient.colorStops[1 - idx].color = color;
        }
    }
}