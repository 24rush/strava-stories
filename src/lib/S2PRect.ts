import { Gradient, Rect } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem } from "./S2PCanvasItem";
import { S2PGradient } from "./S2PGradient";
import type { S2PThemeRect } from "./S2PTheme";

export class S2PRect extends Rect implements S2PCanvasItem {
    s2pType: S2PCanvasItemType;
    private gradient: S2PGradient;

    constructor(rect: S2PThemeRect) {
        super();

        this.strokeUniform = true;
        this.s2pType = S2PCanvasItemType.Rect;

        this.width = rect.width;
        this.height = rect.height;
        this.angle = rect.angle;
        this.top = rect.top;
        this.left = rect.left;
        this.rx = rect.rx;
        this.ry = rect.ry;
        this.strokeWidth = rect.strokeWidth;

        this.gradient = new S2PGradient(rect.fill, rect.stroke);
        this.set("fill", this.fillGradient);
        this.set("stroke", this.strokeGradient);
    }

    public getStrokeStop(idx: number): string | null {
        return this.gradient.getStrokeStop(idx);
    }
    public getFillStop(idx: number): string | null {
        return this.gradient.getFillStop(idx);
    }
    public setStrokeStop(idx: number, color: string): void {
        this.gradient.setStrokeStop(idx, color);
        this.set('stroke', this.gradient.strokeGradient);
        this.setDirty();
    }
    public setFillStop(idx: number, color: string): void {
        this.gradient.setFillStop(idx, color);
        this.set('fill', this.gradient.fillGradient);
        this.setDirty();
    }
    get strokeGradient(): Gradient<unknown, "linear"> {
        return this.gradient.strokeGradient;
    }
    get fillGradient(): Gradient<unknown, "linear"> {
        return this.gradient.fillGradient;
    }

    setDirty() {
        this.dirty = true;
        this.setCoords();
    }
}