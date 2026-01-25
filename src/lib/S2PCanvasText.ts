import { Canvas, FabricObject, Gradient, IText, Line } from 'fabric'
import { type S2PCanvasItem, S2PCanvasItemType } from './S2PCanvasItem';
import { S2PThemeText } from './S2PTheme';
import { S2PGradient } from './S2PGradient';

export class S2PCanvasText extends IText implements S2PCanvasItem {
    private label_: string;

    private id_ = `${Math.random().toString(36).slice(2, 9)}`;

    private shouldShowGuides = false;
    private vGuide: Line;
    private hGuide: Line;

    private canvasRef: Canvas;
    private gradient: S2PGradient;
    private origGradient: S2PGradient;

    constructor(textProps: S2PThemeText, canvasRef: Canvas) {
        let originalCharSpacing = textProps.charSpacing ?? 0;
        let dpr = window.devicePixelRatio;

        super(textProps.value ?? "", {
            fontSize: textProps.fontSize,
            fontFamily: textProps.fontFamily,
            fontWeight: textProps.fontWeight,
            charSpacing: originalCharSpacing * dpr,
            fontStyle: textProps.fontStyle,
            strokeWidth: textProps.strokeWidth,
            angle: textProps.angle,
            originX: "left",
            originY: "top",
            width: 2000,
            scaleX: textProps.scaleX,
            scaleY: textProps.scaleY
        });
        this.canvasRef = canvasRef;

        this.id_ = (!textProps.id || textProps.id == "") ? this.id_ : textProps.id;
        this.label_ = textProps.label;
        this.s2pType = S2PCanvasItemType.Text;
        this.objectCaching = false;

        let self = this;
        this.vGuide = new Line([0, 0, 0, 0], {
            stroke: "red",
            selectable: false,
            evented: false,
            visible: self.shouldShowGuides,
        });

        this.hGuide = new Line([0, 0, 0, 0], {
            stroke: "red",
            selectable: false,
            evented: false,
            visible: self.shouldShowGuides,
        });

        this.on("moving", function (e) {
            self.showGuides();
        });

        this.on("modified", function (e) {
            self.showGuides();
        });

        this.gradient = new S2PGradient(textProps.fill, textProps.stroke);
        this.set("fill", this.fillGradient);
        this.set("stroke", this.strokeGradient);

        this.origGradient = new S2PGradient(textProps.fill, textProps.stroke);

        this.set('width', this.calcTextHeight() + 5);
        this.initDimensions();
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
    }
    public setFillStop(idx: number, color: string): void {
        this.gradient.setFillStop(idx, color);
        this.set('fill', this.gradient.fillGradient);
    }
    get strokeGradient(): Gradient<unknown, "linear"> {
        return this.gradient.strokeGradient;
    }
    get fillGradient(): Gradient<unknown, "linear"> {
        return this.gradient.fillGradient;
    }

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Text;

    get id(): string { return this.id_; }
    set id(value: string) { this.id_ = value; }

    get label(): string { return this.label_; }
    set label(value: string) { this.label_ = value; }

    get auxItems(): FabricObject[] {
        return [this.vGuide, this.hGuide];
    }

    get textProps(): S2PThemeText {
        return {
            ...new S2PThemeText(),
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            charSpacing: this.charSpacing,

            scaleX: this.scaleX,
            scaleY: this.scaleY,
            angle: this.angle,

            fill: this.gradient.fill_,
            stroke: this.gradient.stroke_,
            strokeWidth: this.strokeWidth
        };
    }

    showGuides() {
        let self = this;
        const rect = this.getBoundingRect();

        const center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        this.vGuide.set({
            visible: self.shouldShowGuides,
            x1: center.x,
            y1: 0,
            x2: center.x,
            y2: this.canvasRef.height,
        });

        this.hGuide.set({
            visible: self.shouldShowGuides,
            x1: 0,
            y1: center.y,
            x2: this.canvasRef.width,
            y2: center.y,
        });

        this.canvasRef.requestRenderAll();
    };

    setShowGuides(showGuides: boolean) {
        this.shouldShowGuides = showGuides;
        this.showGuides();
    }

    setPosition(left: number, top: number) {
        this.top = top;
        this.left = left;

        this.setCoords();
        this.showGuides();
    }
}