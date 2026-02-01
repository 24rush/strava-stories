import { Gradient, Rect } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem, S2PCanvasItemFeature, type FeatureHandlers, PropertyExtender } from "./S2PCanvasItem";
import { S2PGradient } from "./S2PGradient";
import { S2PThemeObject } from "./S2PTheme";

export class S2PRect extends Rect implements S2PCanvasItem {
    s2pType: S2PCanvasItemType;

    private gradient: S2PGradient;
    private origGradient: S2PGradient;

    private rectTheme: S2PThemeObject;

    constructor(rectTheme: S2PThemeObject) {
        super();
        PropertyExtender.attachPropertiesTyped(this, this.themeProperties);

        this.rectTheme = new S2PThemeObject(rectTheme);

        this.strokeUniform = true;
        this.s2pType = S2PCanvasItemType.Rect;

        this.width = rectTheme.width;
        this.height = rectTheme.height;
        this.angle = rectTheme.angle;
        this.top = rectTheme.top;
        this.left = rectTheme.left;
        this.rx = rectTheme.rx;
        this.ry = rectTheme.ry;
        this.strokeWidth = rectTheme.strokeWidth;
        this.objectCaching = false;

        this.gradient = new S2PGradient(rectTheme.fill, rectTheme.stroke);
        this.set("fill", this.fillGradient);
        this.set("stroke", this.strokeGradient);

        this.origGradient = new S2PGradient(rectTheme.fill, rectTheme.stroke);
    }

    private themeProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Label,
        
        S2PCanvasItemFeature.Rx,
        S2PCanvasItemFeature.Ry,
        S2PCanvasItemFeature.StrokeWidth
    ];

    private fabricProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Stroke,
        S2PCanvasItemFeature.Fill,
    ];

    hasProperty(feature: S2PCanvasItemFeature): boolean {
        return this.themeProperties.includes(feature) || this.fabricProperties.includes(feature);
    }

    getProperty<K extends keyof FeatureHandlers>(
        property: K
    ): FeatureHandlers[K]['get'] {  
        return this.rectTheme[property];
    }

   setProperty<K extends keyof FeatureHandlers>(
        property: K,
        ...args: FeatureHandlers[K]['set']
    ) {
        this.rectTheme.setProperty(property, ...args);
    }

    public resetColor(): void {
        this.gradient = this.origGradient.clone();
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
    
    private setDirty() {
        this.dirty = true;
        this.setCoords();                  
    }
}