import { Gradient, Group, Polygon, Polyline, util } from "fabric";
import type { XYPoint } from "./geometry/polyline";
import { type S2PCanvasItem, S2PCanvasItemType, type S2PAnimatedCanvasObject, S2PAnimationSettings } from "./S2PCanvasItem";
import { S2PGradient } from "./S2PGradient";
import type { S2PThemePoly } from "./S2PTheme";

export class S2PCanvasPoly extends Group implements S2PCanvasItem, S2PAnimatedCanvasObject {
    private polylineObj: Polyline | undefined;
    private polygonObj: Polygon | undefined;
    private points: XYPoint[] = [];

    private maxWidth: number = 0;
    private maxHeight: number = 0;
    private left_: number = 0;
    private top_: number = 0;
    private label_: string = "";
    private gradient: S2PGradient;
    private origGradient: S2PGradient;

    private animationSettings_: S2PAnimationSettings = {
        ...new S2PAnimationSettings(),
        duration: 3000
    };

    constructor(label: string, maxWidth: number, maxHeight: number, poly: S2PThemePoly) {
        super();
        this.label_ = label;
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.top_ = poly.top;
        this.left_ = poly.left;
        this.gradient = new S2PGradient(poly.fill, poly.stroke);
        this.origGradient = new S2PGradient(poly.fill, poly.stroke);
    }

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Polyline;

    get label(): string { return this.label_; }
    get isPolyline(): boolean { return this.s2pType == S2PCanvasItemType.Polyline; }
    get animationSettings(): S2PAnimationSettings { return this.animationSettings_; }

    public resetColor(): void {
        this.gradient = this.origGradient.clone();

        if (this.s2pType == S2PCanvasItemType.Polyline) {
            this.polylineObj?.set('stroke', this.gradient.strokeGradient);
            this.polylineObj?.set('fill', this.gradient.fillGradient);
        } else {
            this.polylineObj?.set('stroke', this.gradient.strokeGradient);
            this.polygonObj?.set('fill', this.gradient.fillGradient);
        }
    }

    public getStrokeStop(idx: number): string {
        return this.gradient.getStrokeStop(idx);
    }
    public getFillStop(idx: number): string {
        return this.gradient.getFillStop(idx);
    }
    public setStrokeStop(idx: number, color: string): void {
        this.gradient.setStrokeStop(idx, color);
        if (this.polylineObj) this.polylineObj.set('stroke', this.gradient.strokeGradient);

        this.setDirty();
    }
    public setFillStop(idx: number, color: string): void {
        this.gradient.setFillStop(idx, color);
        if (this.polygonObj && this.s2pType == S2PCanvasItemType.FilledPolyline) this.polygonObj.set("fill", this.gradient.fillGradient);
        if (this.polylineObj && this.s2pType == S2PCanvasItemType.Polyline) this.polylineObj.set("fill", this.gradient.fillGradient);

        this.setDirty();
    }
    get strokeGradient(): Gradient<unknown, "linear"> {
        return this.gradient.strokeGradient;
    }
    get fillGradient(): Gradient<unknown, "linear"> {
        return this.gradient.fillGradient;
    }

    set strokeWidth(width: number) {
        if (this.polylineObj) {
            this.polylineObj.set("strokeWidth", width);
            this.polylineObj.setCoords();
        }
    }

    get strokeWidth(): number {
        return this.polylineObj ? this.polylineObj.get("strokeWidth") : 4;
    }

    setDirty() {
        if (this.polygonObj) {
            this.polygonObj.dirty = true;
            this.polygonObj.setCoords();
        }

        if (this.polylineObj) {
            this.polylineObj.dirty = true;
            this.polylineObj.setCoords();
        }
    }

    createPolyline(points: XYPoint[]) {
        this.s2pType = S2PCanvasItemType.Polyline;
        this.points = [...points];

        this.polylineObj = new Polyline(this.points, {
            strokeWidth: 4,
            fill: null,
            objectCaching: false,
        });
        this.polylineObj.objectCaching = false;
        this.polylineObj.set('stroke', this.gradient.strokeGradient);
        this.polylineObj.set('fill', this.gradient.fillGradient);

        this.add(this.polylineObj);

        this.top = this.top_;
        this.left = this.left_;
        this.s2pType = S2PCanvasItemType.Polyline;
    }

    createFilledPolyline(points: XYPoint[]) {
        this.s2pType = S2PCanvasItemType.FilledPolyline;
        this.points = points;

        this.polylineObj = new Polyline(this.points, {
            strokeWidth: 2,
            fill: null,
            objectCaching: false
        });
        this.polylineObj.set('stroke', this.gradient.strokeGradient);

        let fillPoints = [...points];
        fillPoints.push(
            {
                //@ts-ignore
                x: points[points.length - 1].x,
                y: this.maxHeight,
            },
            //@ts-ignore
            { x: points[0].x, y: this.maxHeight }, // bottom left
        );

        this.polygonObj = new Polygon(fillPoints, {
            objectCaching: false
        });

        this.polygonObj.set('fill', this.gradient.fillGradient);

        this.add(this.polylineObj, this.polygonObj);
        this.top = this.top_;
        this.left = this.left_;
        this.s2pType = S2PCanvasItemType.FilledPolyline;
    }

    public startAnimation(): util.TAnimation<number>[] | null {
        const full = this.points;
        const step = Math.ceil(full.length / 60);

        if (this.s2pType == S2PCanvasItemType.Polyline) {
            let i = step;
            this.polylineObj?.set({ points: full.slice(0, i) });

            return [util.animate({
                startValue: i,
                endValue: full.length,
                duration: this.animationSettings.duration,
                easing: this.animationSettings.easing,
                onChange: (v: number) => {
                    const idx = Math.floor(v);
                    this.polylineObj?.set('points', full.slice(0, idx));

                    this.canvas?.requestRenderAll();
                }
            })];
        }

        if (this.s2pType == S2PCanvasItemType.FilledPolyline) {
            let i = step;
            this.polylineObj?.set({ points: full.slice(0, i) });

            return [util.animate({
                startValue: i,
                endValue: full.length,
                duration: this.animationSettings.duration,
                easing: this.animationSettings.easing,
                onChange: (v: number) => {
                    const idx = Math.floor(v);
                    this.polylineObj?.set('points', full.slice(0, idx));

                    this.canvas?.requestRenderAll();
                }
            })];
        }

        return null;
    }
}