import { Gradient, Group, IText, Rect, util } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem, S2PAnimationSettings } from "./S2PCanvasItem";
import type { S2PThemeSplits } from "./S2PTheme";
import type { SplitData } from "./utils/fieldmappings";
import { Converters } from "./utils/converters";
import { S2PGradient } from "./S2PGradient";

export class S2PSplitsAnimationSettings extends S2PAnimationSettings {
    duration: number = 1000;
    barsEasing: util.TEasingFunction = util.ease.easeOutCubic;
    textsEasing: util.TEasingFunction = util.ease.easeOutElastic;
}

export class S2PSplits extends Group implements S2PCanvasItem {
    private gradient: S2PGradient;
    private origGradient: S2PGradient;
    private gradientTextColor: S2PGradient;

    private bars: Rect[] = [];
    private texts: IText[] = [];
    private splitTheme: S2PThemeSplits;

    private split_data: SplitData[] = [];
    private lastLeft: number = -1;
    private lastTop: number = -1;

    private animationSettings_: S2PSplitsAnimationSettings = new S2PSplitsAnimationSettings();

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
    get animationSettings(): S2PSplitsAnimationSettings { return this.animationSettings_; }

    get barWidth() { return this.splitTheme.barWidth; }
    set barWidth(newValue: number) {
        this.splitTheme.barWidth = newValue;

        this.createSplitsChart(this.split_data);
        this.setDirty();
    }

    get barGap() { return this.splitTheme.barGap; }
    set barGap(newValue: number) {
        this.splitTheme.barGap = newValue;

        this.createSplitsChart(this.split_data);
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

        this.lastLeft = (this.lastLeft == -1) ? this.splitTheme.left : this.left;
        this.lastTop = (this.lastTop == -1) ? this.splitTheme.top : this.top;

        this.removeAll();
        this.bars = []; this.texts = [];

        let speeds = split_data.map(sd => { return 1000 / sd.average_speed });
        const maxPace = Math.max(...speeds);

        split_data.forEach((split, index) => {
            const pace = 1000 / split.average_speed;
            let barLength = (pace / maxPace) * this.splitTheme.width - 40;

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
                    fontSize: Math.round(this.barWidth * 0.75),
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
                    fontSize: Math.round(this.barWidth * 0.6),
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
                    fontSize: Math.round(this.barWidth * 0.6),
                    fontFamily: this.splitTheme.fontFamily,
                    fontStyle: this.splitTheme.fontStyle,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false
                }
            );

            this.bars.push(bar);
            this.texts.push(kmLabel, speedLabel, bpmLabel, elevationLabel);
        });

        this.add(...this.bars, ...this.texts);

        this.setCoords();
        this.left = this.lastLeft;
        this.top = this.lastTop;
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
        [this.bars].forEach(objs => objs.forEach(item => {
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

    public startAnimation(): util.TAnimation<number>[] | null {
        let animations: util.TAnimation<number>[] = [];
        this.createSplitsChart();

        this.texts.forEach((obj, i) => {
            if ('label' in obj && obj['label'] == 'back')
                return;

            animations.push(util.animate({
                startValue: -100,
                endValue: obj.left,
                duration: this.animationSettings.duration,
                delay: i * 10,
                easing: this.animationSettings.textsEasing,
                onChange: (value) => {
                    obj.set('left', value);
                    this.canvas?.requestRenderAll();
                }
            }));
        });

        this.bars.forEach((obj, i) => {
            const startWidth = obj.width;
            obj.set('width', 0);

            animations.push(util.animate({
                startValue: 0,
                endValue: startWidth,
                duration: this.animationSettings.duration,
                delay: i * 20,
                easing: this.animationSettings.barsEasing,
                onChange: (value) => {
                    obj.set('width', value);
                    this.canvas?.requestRenderAll();
                }
            }));
        });

        return animations;
    }
}
