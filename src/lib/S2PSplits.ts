import { Canvas, Gradient, Group, IText, Rect, util } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem } from "./S2PCanvasItem";
import type { S2PThemeSplits } from "./S2PTheme";
import type { SplitData } from "./utils/fieldmappings";
import { Converters } from "./utils/converters";
import { S2PGradient } from "./S2PGradient";

export class S2PSplits extends Group implements S2PCanvasItem {
    private gradient: S2PGradient;
    private origGradient: S2PGradient;
    private gradientTextColor: S2PGradient;

    private bars: Rect[] = [];
    private backs: Rect[] = [];
    private texts: IText[] = [];
    private splitTheme: S2PThemeSplits;

    private split_data: SplitData[] = [];

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Splits;

    constructor(splitTheme: S2PThemeSplits) {
        super()
        this.splitTheme = structuredClone(splitTheme);

        this.gradient = new S2PGradient(splitTheme.fill, splitTheme.stroke);
        this.origGradient = new S2PGradient(splitTheme.fill, splitTheme.stroke);
        this.gradientTextColor = new S2PGradient(splitTheme.textColor, splitTheme.textColor);

        this.angle = this.splitTheme.angle;
        this.scaleX = this.splitTheme.scaleX;
        this.scaleY = this.splitTheme.scaleY;

        this.width = this.splitTheme.width;
        this.height = this.splitTheme.height;

        this.set({ originX: "left", originY: "top" });
    }

    get themeData(): S2PThemeSplits {
        this.splitTheme.left = this.left;
        this.splitTheme.top = this.top;
        this.splitTheme.width = this.width;
        this.splitTheme.height = this.height;
        this.splitTheme.angle = this.angle;
        this.splitTheme.scaleX = this.scaleX;
        this.splitTheme.scaleY = this.scaleY;

        return this.splitTheme;
    }
    get label(): string { return this.splitTheme.label; }

    get barWidth() { return this.splitTheme.barWidth; }
    set barWidth(newValue: number) {
        this.splitTheme.barWidth = newValue;

        this.createSplitsChart();
        this.setDirty();
    }

    get barGap() { return this.splitTheme.barGap; }
    set barGap(newValue: number) {
        this.splitTheme.barGap = newValue;

        this.createSplitsChart();
        this.setDirty();
    }

    get rx(): number { return this.splitTheme.rx; }
    set rx(radius: number) {
        this.splitTheme.rx = radius;

        this.bars.forEach(bar => {
            bar.set('rx', radius);
            bar.set('ry', radius);
        });

        this.setDirty();
    }

    get fontFamily() { return this.splitTheme.fontFamily };

    set fontFamily(newFontFamily: string) {
        this.splitTheme.fontFamily = newFontFamily;

        [this.texts].forEach(objects => objects.forEach((item, index) => {
            item.fontFamily = newFontFamily;
        }));

        this.setDirty();
    }

    get fontStyle() { return this.splitTheme.fontStyle };

    set fontStyle(newFontStyle: string) {
        this.splitTheme.fontStyle = newFontStyle;

        [this.texts].forEach(objects => objects.forEach((item, index) => {
            item.fontStyle = newFontStyle;
        }));

        this.setDirty();
    }

    public createSplitsChart(split_data: SplitData[] = this.split_data) {
        if (!split_data || split_data.length == 0) return;
        this.split_data = split_data;

        this.removeAll();
        this.bars = []; this.texts = []; this.backs = [];

        let speeds = split_data.map(sd => { return 1000 / sd.average_speed });
        const maxPace = Math.max(...speeds);

        split_data.forEach((split, index) => {
            const pace = 1000 / split.average_speed;
            let barLength = (pace / maxPace) * this.splitTheme.width - 80;

            const top =
                this.splitTheme.top + index * (this.barWidth + this.barGap);

            const kmLabel = new IText(
                (index == speeds.length - 1) ? (split.distance / 1000).toFixed(2) : `${index + 1}`,
                {
                    width: 200,
                    left: 0,
                    top: top + this.barWidth / 2,
                    originX: 'right',
                    originY: "center",
                    fontSize: Math.round(this.barWidth * 0.5),
                    fontStyle: this.splitTheme.fontStyle,
                    fontFamily: this.splitTheme.fontFamily,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false,
                }
            );

            let back = new Rect({                
                left: -30,
                top: top,
                width: this.splitTheme.width - 10,
                height: this.barWidth + 1 * this.barGap,
                originX: "left",
                originY: "top",
                fill: "#0000000A",
                strokeWidth: this.splitTheme.strokeWidth,
                selectable: false,
                objectCaching: false
            });

            let bar = new Rect({
                left: 6,
                top: top,
                width: barLength,
                height: this.barWidth,
                originX: "left",
                originY: "top",
                fill: this.gradient.fillGradient,
                stroke: this.gradient.strokeGradient,
                strokeWidth: this.splitTheme.strokeWidth,
                selectable: false,
                objectCaching: false
            });

            const speedLabel = new IText(
                Converters.mpsToPace(split.average_speed) + " /km",
                {
                    width: 200,
                    left: 12,
                    top: top + this.barWidth / 2,
                    originX: 'left',
                    originY: "center",
                    fontSize: Math.round(this.barWidth * 0.65),
                    fontFamily: this.splitTheme.fontFamily,
                    fontStyle: this.splitTheme.fontStyle,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false
                }
            );

            const bpmLabel = new IText(
                split.average_heartrate.toFixed(0) + "",
                {
                    width: 200,
                    left: barLength,
                    top: top + this.barWidth / 2,
                    originX: 'right',
                    originY: "center",
                    fontSize: Math.round(this.barWidth * 0.5),
                    fontFamily: this.splitTheme.fontFamily,
                    fontStyle: this.splitTheme.fontStyle,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false
                }
            );

            const elevationLabel = new IText(
                split.elevation_difference.toFixed(0) + " m",
                {
                    width: 200,
                    left: barLength + 6,
                    top: top + this.barWidth / 2,
                    originX: 'left',
                    originY: "center",
                    fontSize: Math.round(this.barWidth * 0.5),
                    fontFamily: this.splitTheme.fontFamily,
                    fontStyle: this.splitTheme.fontStyle,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false
                }
            );

            this.bars.push(bar);
            this.backs.push(back);
            this.texts.push(kmLabel, speedLabel, bpmLabel, elevationLabel);
        });

        this.add(...this.bars, ...this.texts, ...this.backs);
        this.setCoords();
        this.left = this.splitTheme.left;
        this.top = this.splitTheme.top;

        this.startAnimation();
    }

    public getStrokeStop(idx: number): string {
        return this.gradient.getStrokeStop(idx);
    }
    public getFillStop(idx: number): string {
        return this.gradient.getFillStop(idx);
    }
    public getTextFillStop(idx: number): string {
        return this.gradientTextColor.getFillStop(idx);
    }

    public setStrokeStop(idx: number, color: string): void {
        this.gradient.setStrokeStop(idx, color);
        this.splitTheme.stroke[idx] = color;

        this.setDirty();
    }
    public setFillStop(idx: number, color: string): void {
        this.gradient.setFillStop(idx, color);
        this.splitTheme.fill[idx] = color;

        this.setDirty();
    }
    public setTextGradient(color1: string, color2?: string) {
        this.gradientTextColor.setFillStop(0, color1);
        this.gradientTextColor.setFillStop(1, color2 ?? color1);
        this.splitTheme.textColor[0] = color1;
        this.splitTheme.textColor[1] = color2 ?? color1;

        this.setDirty();
    }

    get strokeGradient(): Gradient<unknown, "linear"> {
        return this.gradient.strokeGradient;
    }
    get fillGradient(): Gradient<unknown, "linear"> {
        return this.gradient.fillGradient;
    }
    get textGradient(): Gradient<unknown, "linear"> {
        return this.gradientTextColor.fillGradient;
    }

    public resetColor(): void {
        this.gradient = this.origGradient.clone();
        this.setDirty();
    }

    set strokeWidth(width: number) {
        if (!this.bars) return;

        this.splitTheme.strokeWidth = width;
        this.bars.forEach(bar => bar.strokeWidth = width);
        this.setDirty();
    }

    get strokeWidth(): number {
        return this.splitTheme.strokeWidth;
    }

    private setDirty() {
        [this.bars, this.backs].forEach(objs => objs.forEach(item => {
            item.dirty = true;
            item.setCoords();
        }));

        [this.texts].forEach(objs => objs.forEach(item => {
            item.dirty = true;
            item.initDimensions();
            item.setCoords();
        }));

        this.dirty = true;
        this.setCoords();
    }

    public getAnimationDuration() { return 1000; }
    public startAnimation() {
        this.texts.forEach((obj, i) => {
            if ('label' in obj && obj['label'] == 'back')
                return;

            util.animate({
                startValue: -100,
                endValue: obj.left,
                duration: this.getAnimationDuration(),
                delay: i * 10,
                easing: util.ease.easeOutElastic,
                onChange: (value) => {
                    obj.set('left', value);                    
                    this.canvas?.requestRenderAll();
                }
            });
        });

        this.bars.forEach((obj, i) => {
            const startWidth = obj.width;
            obj.set('width', 0);

            util.animate({
                startValue: 0,
                endValue: startWidth,
                duration: this.getAnimationDuration(),
                delay: i * 20,
                easing: util.ease.easeOutCubic,
                onChange: (value) => {
                    obj.set('width', value);                    
                    this.canvas?.requestRenderAll();
                }
            });
        });
    }

}
