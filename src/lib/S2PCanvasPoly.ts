import { Gradient, Group, Polygon, Polyline, util } from "fabric";
import type { XYPoint } from "./geometry/polyline";
import { type S2PCanvasItem, S2PCanvasItemType, type S2PAnimatedCanvasObject, S2PAnimationSettings, S2PCanvasItemFeature, type FeatureHandlers, PropertyExtender } from "./S2PCanvasItem";
import { S2PGradient } from "./S2PGradient";
import { S2PThemeObject } from "./S2PTheme";
import { decreaseHexaOpacity } from "./utils/colors";

export type S2PCanvasPolySection = {
    start: number,
    end: number,
    highlight: boolean
}

export class S2PCanvasPoly extends Group implements S2PCanvasItem, S2PAnimatedCanvasObject {
    private polylineObj: Polyline | undefined;
    private polygonObjs: Polygon[] = [];
    private points: XYPoint[] = [];

    private maxWidth: number = 0;
    private maxHeight: number = 0;
    private left_: number = 0;
    private top_: number = 0;

    private gradient: S2PGradient;
    private unhighlightGradient: S2PGradient
    private origGradient: S2PGradient;
    private polyTheme: S2PThemeObject;

    private animationSettings_: S2PAnimationSettings = {
        ...new S2PAnimationSettings(),
        duration: 3000
    };

    private themeProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Label,
        S2PCanvasItemFeature.StrokeWidth
    ];

    private fabricProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Stroke,
        S2PCanvasItemFeature.Fill,
    ];

    constructor(label: string, maxWidth: number, maxHeight: number, poly: S2PThemeObject) {
        super();
        PropertyExtender.attachPropertiesTyped(this, this.themeProperties);

        this.polyTheme = new S2PThemeObject({ ...poly, label });

        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.top_ = poly.top;
        this.left_ = poly.left;

        this.gradient = new S2PGradient(poly.fill, poly.stroke);
        this.origGradient = new S2PGradient(poly.fill, poly.stroke);
        let decrOpacityColors = [decreaseHexaOpacity(poly.fill[0]), decreaseHexaOpacity(poly.fill[1])];
        this.unhighlightGradient = new S2PGradient(decrOpacityColors, decrOpacityColors);
    }

    hasProperty(feature: S2PCanvasItemFeature): boolean {
        return this.themeProperties.includes(feature) || this.fabricProperties.includes(feature);
    }

    getProperty<K extends keyof FeatureHandlers>(property: K): FeatureHandlers[K]["get"] {
        switch (property) {
            case S2PCanvasItemFeature.StrokeWidth:
                return this.polylineObj ? this.polylineObj.get("strokeWidth") : 4;
            default:
                return this.polyTheme[property];
        }
    }

    setProperty<K extends keyof FeatureHandlers>(property: K, ...args: FeatureHandlers[K]["set"]): void {
        this.polyTheme.setProperty(property, ...args);

        switch (property) {
            case S2PCanvasItemFeature.StrokeWidth:
                if (this.polylineObj) {
                    const [width] = args;

                    this.polylineObj.set("strokeWidth", width);
                    this.polylineObj.setCoords();
                }
        }
    }

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Polyline;
    get isPolyline(): boolean { return this.s2pType == S2PCanvasItemType.Polyline; }

    get animationSettings(): S2PAnimationSettings { return this.animationSettings_; }

    get themeData(): S2PThemeObject {
        this.polyTheme.left = this.left;
        this.polyTheme.top = this.top;
        this.polyTheme.width = this.width;
        this.polyTheme.height = this.height;
        this.polyTheme.angle = this.angle;
        this.polyTheme.scaleX = this.scaleX;
        this.polyTheme.scaleY = this.scaleY;

        return this.polyTheme;
    }

    public resetColor(): void {
        this.gradient = this.origGradient.clone();

        if (this.s2pType == S2PCanvasItemType.Polyline) {
            this.polylineObj?.set('stroke', this.gradient.strokeGradient);
            this.polylineObj?.set('fill', this.gradient.fillGradient);
        } else {
            this.polylineObj?.set('stroke', this.gradient.strokeGradient);
            this.polygonObjs.forEach(p => p.set('fill', this.gradient.fillGradient));
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
        this.unhighlightGradient.setFillStop(idx, decreaseHexaOpacity(color));

        if (this.polygonObjs && this.s2pType == S2PCanvasItemType.FilledPolyline) {
            this.polygonObjs.forEach(p => p.set("fill", p.highlight ? this.gradient.fillGradient : this.unhighlightGradient.fillGradient));
        }

        if (this.polylineObj && this.s2pType == S2PCanvasItemType.Polyline)
            this.polylineObj.set("fill", this.gradient.fillGradient);

        this.setDirty();
    }
    get strokeGradient(): Gradient<unknown, "linear"> {
        return this.gradient.strokeGradient;
    }
    get fillGradient(): Gradient<unknown, "linear"> {
        return this.gradient.fillGradient;
    }

    setDirty() {
        if (this.polygonObjs) {
            this.polygonObjs.forEach(p => {
                p.dirty = true;
                p.setCoords();
            });
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
        this.polylineObj.set({ points: [this.points[0]] });

        this.add(this.polylineObj);

        this.top = this.top_;
        this.left = this.left_;
        this.s2pType = S2PCanvasItemType.Polyline;
    }

    createSlicedFilledPolyline(points: XYPoint[], sections: S2PCanvasPolySection[]) {
        if (!sections.length) return;

        this.s2pType = S2PCanvasItemType.FilledPolyline;
        this.points = [...points];

        this.polylineObj = new Polyline(this.points, {
            strokeWidth: 2,
            fill: null,
            objectCaching: false
        });
        this.polylineObj.set('stroke', this.gradient.strokeGradient);
        this.polylineObj.set({ points: [this.points[0]] });

        let fillPoints = [...points];

        let createPolygonForSection = (sectionDef: S2PCanvasPolySection): Polygon => {
            let polygonPoints = fillPoints.slice(sectionDef.start, sectionDef.end);

            polygonPoints.push(
                {
                    //@ts-ignore
                    x: points[sectionDef.end].x,
                    y: this.maxHeight,
                },
                //@ts-ignore
                { x: points[sectionDef.start].x, y: this.maxHeight }, // bottom left
            );

            let polygonObj = new Polygon(polygonPoints, {
                objectCaching: false
            });

            polygonObj.highlight = sectionDef.highlight;
            polygonObj.set('fill', sectionDef.highlight ? this.gradient.fillGradient : this.unhighlightGradient.fillGradient);

            return polygonObj;
        }

        let lastSectionEnd = 0;
        for (let i = 0; i < sections.length; i++) {
            if (!sections[i]) continue;

            let sectionStart = sections[i].start;
            let sectionEnd = sections[i]?.end;

            if (sectionStart != lastSectionEnd && lastSectionEnd < fillPoints.length - 1) {
                this.polygonObjs?.push(createPolygonForSection({
                    start: lastSectionEnd + 1,
                    end: sectionStart,
                    highlight: false
                }));
            }

            if (sectionEnd - sectionStart - 1 > 0)
                this.polygonObjs?.push(createPolygonForSection({
                    start: sectionStart + 1,
                    end: sectionEnd,
                    highlight: sections[i]?.highlight
                }));

            lastSectionEnd = sectionEnd;
        }

        if (lastSectionEnd < fillPoints.length) {
            this.polygonObjs?.push(createPolygonForSection({
                start: lastSectionEnd + 1,
                end: fillPoints.length - 1,
                highlight: false
            }));
        }

        this.add(this.polylineObj, ...this.polygonObjs);
        this.top = this.top_;
        this.left = this.left_;
        this.s2pType = S2PCanvasItemType.FilledPolyline;
    }

    createFilledPolyline(points: XYPoint[]) {
        this.s2pType = S2PCanvasItemType.FilledPolyline;
        this.points = [...points];

        this.polylineObj = new Polyline(this.points, {
            strokeWidth: 2,
            fill: null,
            objectCaching: false
        });
        this.polylineObj.set('stroke', this.gradient.strokeGradient);
        this.polylineObj.set({ points: [this.points[0]] });

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

        this.polygonObjs.push(new Polygon(fillPoints, {
            objectCaching: false
        }));

        this.polygonObjs[0]?.set('fill', this.gradient.fillGradient);

        this.add(this.polylineObj, this.polygonObjs[0]);
        this.top = this.top_;
        this.left = this.left_;
    }

    public startAnimation(): util.TAnimation<number>[] | null {
        const full = this.points;
        const step = Math.ceil(full.length / 60);

        let i = step;
        this.polylineObj?.set({ points: full.slice(0, i) });

        return [util.animate({
            startValue: i,
            endValue: full.length,
            duration: this.animationSettings.duration,
            easing: this.animationSettings.easing,
            onChange: (v: number) => {
                if (isNaN(v)) return;

                const idx = Math.floor(v);
                this.polylineObj?.set('points', full.slice(0, idx));

                this.canvas?.requestRenderAll();
            }
        })];
    }
}