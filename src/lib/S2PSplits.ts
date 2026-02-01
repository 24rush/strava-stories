import { Gradient, Group, IText, Rect, util } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem, S2PAnimationSettings, S2PCanvasItemFeature, type FeatureHandlers, type S2PAnimatedCanvasObject, PropertyExtender } from "./S2PCanvasItem";
import { S2PThemeObject } from "./S2PTheme";
import type { SplitData } from "./utils/fieldmappings";
import { Converters } from "./utils/converters";
import { S2PGradient } from "./S2PGradient";

export class S2PSplitsAnimationSettings extends S2PAnimationSettings {
    duration: number = 1000;
    barsEasing: util.TEasingFunction = util.ease.easeOutCubic;
    textsEasing: util.TEasingFunction = util.ease.easeOutCubic;
}

export class S2PSplits extends Group implements S2PCanvasItem, S2PAnimatedCanvasObject {
    private gradient: S2PGradient;
    private origGradient: S2PGradient;
    private gradientTextColor: S2PGradient;

    private bars: Rect[] = [];
    private texts: IText[] = [];
    private splitTheme: S2PThemeObject;

    private split_data: SplitData[] = [];
    private lastLeft: number = -1;
    private lastTop: number = -1;

    private animationSettings_: S2PSplitsAnimationSettings = new S2PSplitsAnimationSettings();

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Splits;

    constructor(splitTheme: S2PThemeObject) {
        super()
        PropertyExtender.attachPropertiesTyped(this, this.themeProperties);

        this.splitTheme = new S2PThemeObject(splitTheme);

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

    private themeProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Label,

        S2PCanvasItemFeature.Rx,
        S2PCanvasItemFeature.Ry,
        S2PCanvasItemFeature.BarHeight,
        S2PCanvasItemFeature.BarGap,
        S2PCanvasItemFeature.FontFamily,
        S2PCanvasItemFeature.FontStyle,
        S2PCanvasItemFeature.FontWeight,
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
        if (!this.hasProperty(property as S2PCanvasItemFeature))
            throw `Unsupported property ${property}, should not be called`;

        return this.splitTheme[property];
    }

    setProperty<K extends keyof FeatureHandlers>(
        property: K,
        ...args: FeatureHandlers[K]['set']
    ) {
        if (!this.hasProperty(property as S2PCanvasItemFeature))
            throw 'Unsupported property, should not be called';

        this.splitTheme.setProperty(property, ...args);

        switch (property) {            
            case S2PCanvasItemFeature.Rx:
            case S2PCanvasItemFeature.Ry:
                const [rx] = args;

                this.bars.forEach(bar => {
                    bar.set('rx', rx);
                    bar.set('ry', rx);
                });

                this.setDirty();
                break;
            case S2PCanvasItemFeature.BarHeight:
                this.createSplitsChart(this.split_data);
                this.setDirty();
                break;
            case S2PCanvasItemFeature.BarGap:
                this.createSplitsChart(this.split_data);
                this.setDirty();
                break;
            case S2PCanvasItemFeature.FontFamily:
                const [newFontFamily] = args;
                [this.texts].forEach(objects => objects.forEach((item, index) => {
                    item.fontFamily = newFontFamily as string;
                }));
        
                this.setDirty();
                break;
            case S2PCanvasItemFeature.FontStyle:
                const [newFontStyle] = args;

                [this.texts].forEach(objects => objects.forEach((item, index) => {
                    item.fontStyle = newFontStyle as string;
                }));
        
                this.setDirty();
                break;
            case S2PCanvasItemFeature.FontWeight:
                const [weight] = args;

                this.texts.forEach(text => text.fontWeight = weight);
                this.setDirty();
                break;
            case S2PCanvasItemFeature.StrokeWidth:
                const [width] = args;

                this.splitTheme.strokeWidth = width as number;
                this.bars.forEach(bar => bar.strokeWidth = width as number);
                this.setDirty();
                break;
        }
    }

    get themeData(): S2PThemeObject {
        this.splitTheme.left = this.left;
        this.splitTheme.top = this.top;
        this.splitTheme.width = this.width;
        this.splitTheme.height = this.height;
        this.splitTheme.angle = this.angle;
        this.splitTheme.scaleX = this.scaleX;
        this.splitTheme.scaleY = this.scaleY;

        return this.splitTheme;
    }

    get animationSettings(): S2PSplitsAnimationSettings { return this.animationSettings_; }
 
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
            let barLength = (pace / maxPace - 0.1) * this.splitTheme.width;

            let barHeight = this.getProperty(S2PCanvasItemFeature.BarHeight);
            let barGap = this.getProperty(S2PCanvasItemFeature.BarGap);

            const top =
                this.splitTheme.top + index * (barHeight + barGap);

            const kmLabel = new IText(
                (index == speeds.length - 1) ? (split.distance / 1000).toFixed(2) : `${index + 1}`,
                {
                    width: 200,
                    left: 0,
                    top: top + barHeight / 2,
                    originX: 'right',
                    originY: "center",
                    fontSize: Math.round(barHeight * 0.5),
                    fontStyle: this.splitTheme.fontStyle,
                    fontFamily: this.splitTheme.fontFamily,
                    fontWeight: this.splitTheme.fontWeight,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false,
                }
            );

            let bar = new Rect({
                left: 6,
                top: top,
                width: barLength,
                height: barHeight,
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
                    top: top + barHeight / 2,
                    originX: 'left',
                    originY: "center",
                    fontSize: Math.round(barHeight * 0.75),
                    fontFamily: this.splitTheme.fontFamily,
                    fontStyle: this.splitTheme.fontStyle,
                    fontWeight: this.splitTheme.fontWeight,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false,
                    objectCaching: false
                }
            );

            let bpmLabel = undefined;

            if (split.average_heartrate) {
                bpmLabel = new IText(
                    split.average_heartrate.toFixed(0) + "",
                    {
                        width: 200,
                        left: barLength,
                        top: top + barHeight / 2,
                        originX: 'right',
                        originY: "center",
                        fontSize: Math.round(barHeight * 0.6),
                        fontFamily: this.splitTheme.fontFamily,
                        fontStyle: this.splitTheme.fontStyle,
                        fontWeight: this.splitTheme.fontWeight,
                        fill: this.gradientTextColor.fillGradient,
                        selectable: false,
                        objectCaching: false
                    }
                );
            }

            const elevationLabel = new IText(
                split.elevation_difference.toFixed(0) + " m",
                {
                    width: 200,
                    left: barLength + 6,
                    top: top + barHeight / 2,
                    originX: 'left',
                    originY: "center",
                    fontSize: Math.round(barHeight * 0.6),
                    fontFamily: this.splitTheme.fontFamily,
                    fontStyle: this.splitTheme.fontStyle,
                    fontWeight: this.splitTheme.fontWeight,
                    fill: this.gradientTextColor.fillGradient,
                    selectable: false,
                    objectCaching: false
                }
            );

            this.bars.push(bar);
            this.texts.push(kmLabel, speedLabel, elevationLabel);
            if (bpmLabel)
                this.texts.push(bpmLabel);
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
            animations.push(util.animate({
                startValue: -100,
                endValue: obj.left,
                duration: this.animationSettings.duration,
                delay: i * 10,
                easing: this.animationSettings.textsEasing,
                onChange: (value) => {
                    if (isNaN(value)) return;

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
                    if (isNaN(value)) return;

                    obj.set('width', value);
                    this.canvas?.requestRenderAll();
                }
            }));
        });

        return animations;
    }
}
