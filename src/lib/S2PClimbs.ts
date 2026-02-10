import { Gradient, Group, IText, loadSVGFromURL, util, type TFiller } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem, S2PAnimationSettings, S2PCanvasItemFeature, type FeatureHandlers, type S2PAnimatedCanvasObject, PropertyExtender } from "./S2PCanvasItem";
import { S2PThemeObject } from "./S2PTheme";
import { ClimbData, type StravaData } from "./utils/fieldmappings";
import { S2PGradient } from "./S2PGradient";
import { generateXYFromPoints } from "./geometry/polyline";
import { S2PCanvasPoly } from "./S2PCanvasPoly";
import { S2PSvg } from "./S2PSvg";
import { S2PRect } from "./S2PRect";
import { detectClimbs } from "./geometry/climbsdetector";

export class S2PClimbsAnimationSettings extends S2PAnimationSettings {
    duration: number = 1000;
    barsEasing: util.TEasingFunction = util.ease.easeOutCubic;
    textsEasing: util.TEasingFunction = util.ease.easeOutCubic;
}

export class S2PClimbs extends Group implements S2PCanvasItem, S2PAnimatedCanvasObject {
    private gradient: S2PGradient;
    private origGradient: S2PGradient;
    private gradientTextColor: S2PGradient;

    private polys: S2PCanvasPoly[] = [];
    private texts: IText[] = [];
    private svgs: S2PSvg[] = [];
    private rects: S2PRect[] = [];
    private climbsTheme: S2PThemeObject;

    private lastLeft: number = -1;
    private lastTop: number = -1;

    private strava_data: StravaData | undefined = undefined;
    private climb_data: ClimbData[] = [];
    private user_kgs: string = "";

    private animationSettings_: S2PClimbsAnimationSettings = new S2PClimbsAnimationSettings();

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Climbs;

    constructor(splitTheme: S2PThemeObject, strava_data: StravaData) {
        super()
        PropertyExtender.attachPropertiesTyped(this, this.themeProperties);

        this.climbsTheme = new S2PThemeObject(splitTheme);
        this.strava_data = strava_data;
        this.climb_data = detectClimbs(this.strava_data);

        this.gradient = new S2PGradient(splitTheme.fill, splitTheme.stroke);
        this.origGradient = new S2PGradient(splitTheme.fill, splitTheme.stroke);
        this.gradientTextColor = new S2PGradient(splitTheme.textColor, splitTheme.textColor);

        this.angle = this.climbsTheme.angle;
        this.scaleX = this.climbsTheme.scaleX;
        this.scaleY = this.climbsTheme.scaleY;

        this.width = this.climbsTheme.width;
        this.height = this.climbsTheme.height;

        this.set({ originX: "left", originY: "top" });
    }

    public hasClimbs(): boolean { return this.climb_data.length > 0; }

    private themeProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Label,
        S2PCanvasItemFeature.FontFamily,
        S2PCanvasItemFeature.FontStyle,
        S2PCanvasItemFeature.FontWeight,
        S2PCanvasItemFeature.StrokeWidth
    ];

    private fabricProperties: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Stroke,
        S2PCanvasItemFeature.Fill,
        S2PCanvasItemFeature.Kgs,
    ];

    hasProperty(feature: S2PCanvasItemFeature): boolean {
        return this.themeProperties.includes(feature) || this.fabricProperties.includes(feature);
    }

    getProperty<K extends keyof FeatureHandlers>(
        property: K
    ): FeatureHandlers[K]['get'] {
        return this.climbsTheme[property];
    }

    setProperty<K extends keyof FeatureHandlers>(
        property: K,
        ...args: FeatureHandlers[K]['set']
    ) {
        if (!this.hasProperty(property as S2PCanvasItemFeature))
            throw 'Unsupported property, should not be called';

        this.climbsTheme.setProperty(property, ...args);

        switch (property) {
            case S2PCanvasItemFeature.BarHeight:
                this.createClimbsChart();
                this.setDirty();
                break;
            case S2PCanvasItemFeature.BarGap:
                this.createClimbsChart();
                this.setDirty();
                break;
            case S2PCanvasItemFeature.Kgs:
                this.user_kgs = args.toString();
                this.createClimbsChart();
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

                this.climbsTheme.strokeWidth = width as number;
                this.polys.forEach(bar => bar.strokeWidth = width as number);
                this.setDirty();
                break;
        }
    }

    get themeData(): S2PThemeObject {
        this.climbsTheme.left = this.left;
        this.climbsTheme.top = this.top;
        this.climbsTheme.width = this.width;
        this.climbsTheme.height = this.height;
        this.climbsTheme.angle = this.angle;
        this.climbsTheme.scaleX = this.scaleX;
        this.climbsTheme.scaleY = this.scaleY;

        return this.climbsTheme;
    }

    get animationSettings(): S2PClimbsAnimationSettings { return this.animationSettings_; }

    public async createClimbsChart() {
        if (!this.climb_data || this.climb_data.length == 0) return;

        this.lastLeft = (this.lastLeft == -1) ? this.climbsTheme.left : this.left;
        this.lastTop = (this.lastTop == -1) ? this.climbsTheme.top : this.top;

        this.removeAll();
        this.polys = []; this.texts = []; this.svgs = []; this.rects = [];

        let isRide = this.strava_data?.activityKind.sportType.includes('Ride');

        //if (isRide) 
        {
            // Preload svgs
            for (let idx = 0; idx < this.climb_data.length; idx++) {
                await loadSVGFromURL("/svgs/mountain.svg").then(({ objects, options }) => {
                    if (!objects) return;

                    let svgDim = this.climbsTheme.height / 6 * 0.3;
                    let svg = new S2PSvg(objects, options, { ...new S2PThemeObject({}), width: svgDim, height: svgDim } as S2PThemeObject);
                    svg.setProperty(S2PCanvasItemFeature.Url, "/svgs/mountain.svg");
                    this.svgs.push(svg);
                });
            }
        }

        let barHeight = this.getProperty(S2PCanvasItemFeature.BarHeight);
        let barGap = this.getProperty(S2PCanvasItemFeature.BarGap);
        let fontStyle = {
            fontFamily: this.climbsTheme.fontFamily,
            fontStyle: this.climbsTheme.fontStyle,
            fontWeight: this.climbsTheme.fontWeight,
        }

        let elevProfileWidth = this.climbsTheme.width * 0.8;
        let elevProfileHeight = this.climbsTheme.height / 6;
        let points = generateXYFromPoints(this.strava_data.streams.elevation,
            elevProfileWidth, elevProfileHeight);

        let filledPoly = new S2PCanvasPoly(
            "",
            elevProfileWidth,
            elevProfileHeight,
            {
                ...new S2PThemeObject({}),
                fill: this.climbsTheme.fill,
                stroke: this.climbsTheme.stroke
            } as S2PThemeObject,
        );

        filledPoly.createSlicedFilledPolyline(points,
            this.climb_data.map(cd => { return { start: cd.startIndex, end: cd.endIndex, highlight: true }; }));

        let fontSizeLarge = barHeight * 0.6, fontSizeSmall = barHeight * 0.55;

        let distanceLabels: IText[] = [], powerLabels: IText[] = [],
            elevGainLabels: IText[] = [], avgGradientLabels: IText[] = [];

        this.climb_data.forEach(climb => {
            let hasPower = isRide && climb.average_power;

            let distanceLabel = new IText(
                climb.length > 1000 ? (climb.length / 1000).toFixed(1) + "km" : (climb.length).toFixed(0) + "m",
                {
                    width: 200,
                    originX: 'right',
                    originY: "center",
                    fontSize: fontSizeLarge,
                    ...fontStyle,
                    fill: this.gradientTextColor.fillGradient as TFiller,
                    objectCaching: false
                }
            );
            distanceLabel.setCoords();
            distanceLabels.push(distanceLabel);

            let elevationLabel = new IText(
                '+' + climb.elevation_difference.toFixed(0) + "m",
                {
                    width: 300,
                    originX: 'right',
                    originY: "center",
                    fontSize: fontSizeLarge,
                    ...fontStyle,
                    fill: this.gradientTextColor.fillGradient as TFiller,
                    objectCaching: false
                }
            );
            elevationLabel.setCoords();
            elevGainLabels.push(elevationLabel);

            let avgGradeLabel = new IText(
                climb.average_gradient.toFixed(0) + "%",
                {
                    width: 200,
                    originX: 'right',
                    originY: "center",
                    fontSize: fontSizeLarge,
                    ...fontStyle,
                    fill: this.gradientTextColor.fillGradient as TFiller,
                    objectCaching: false
                }
            );
            avgGradeLabel.setCoords();
            avgGradientLabels.push(avgGradeLabel);

            let powerLabel;
            if (hasPower) {
                powerLabel = new IText(
                    this.user_kgs ? (climb.average_power / parseInt(this.user_kgs)).toFixed(1) + "W/kg" : climb.average_power.toFixed(0) + "W",
                    {
                        width: 200,
                        originX: 'right',
                        originY: "center",
                        fontSize: fontSizeLarge,
                        ...fontStyle,
                        fill: this.gradientTextColor.fillGradient as TFiller,
                        objectCaching: false
                    }
                );
                powerLabel.setCoords();
                powerLabels.push(powerLabel);
            }
        });

        let maxLabelWidth = (arr: IText[]): number => {
            return Math.max(0, ...arr.map(l => { return l.getBoundingRect().width; }));
        }

        let distLabelsMax = maxLabelWidth(distanceLabels);
        let elevGainLabelsMax = maxLabelWidth(elevGainLabels);
        let powerLabelsMax = maxLabelWidth(powerLabels);
        let avgGradientLabelsMax = maxLabelWidth(avgGradientLabels);

        this.climb_data.forEach((climb, index) => {
            let chartLeft = 0;
            const top = 1.5 * fontSizeLarge + filledPoly.top + filledPoly.height + index * (barHeight + barGap);

            let rect, categLabel;

            //if (isRide) 
            {
                // SVG climb category
                const svg = this.svgs[index];
                svg.originY = "center";
                svg.set({
                    left: 5,
                    top: top,
                });

                svg?.setCoords();

                // Background for climb category
                rect = new S2PRect({
                    ...new S2PThemeObject({}),
                    left: 0,
                    top: top,
                    width: svg?.getBoundingRect().width * 2.7,
                    rx: 4,
                    ry: 4,
                    height: svg?.getBoundingRect().height * 2
                } as S2PThemeObject);
                rect.originY = "center";
                rect.fill = this.gradient.fillGradient as TFiller;
                rect.stroke = this.gradient.strokeGradient as TFiller;

                categLabel = new IText(
                    climb.category,
                    {
                        left: rect.getBoundingRect().width * 0.69,
                        top: top,
                        originX: 'center',
                        originY: "center",
                        fontSize: fontSizeLarge,
                        ...fontStyle,
                        fill: this.gradientTextColor.fillGradient as TFiller,
                    }
                );

                rect.setCoords(); categLabel.setCoords();
            }

            let spacingPerc = 1.1;
            let rectBb = rect?.getBoundingRect();
            chartLeft = isRide ? (rectBb.width + distLabelsMax * spacingPerc) : rectBb.width;

            // Length
            const distanceLabel = distanceLabels[index];
            distanceLabel.top = top;
            distanceLabel.left = chartLeft;

            chartLeft += elevGainLabelsMax * spacingPerc;

            const elevationLabel = elevGainLabels[index];
            elevationLabel.left = chartLeft;
            elevationLabel.top = top;

            chartLeft = filledPoly.left + filledPoly.width;

            let powerLabel;
            if (powerLabels[index]) {
                powerLabel = powerLabels[index];
                powerLabel.left = chartLeft;
                powerLabel.top = top;
            }

            chartLeft = powerLabel ? powerLabel.left - (powerLabelsMax * spacingPerc) : chartLeft;

            const avgGradeLabel = avgGradientLabels[index];
            avgGradeLabel.left = chartLeft;
            avgGradeLabel.top = top;

            this.polys.push(filledPoly);
            if (isRide) {
                if (rect) this.rects.push(rect);
                if (powerLabel) this.texts.push(powerLabel);
                if (categLabel) this.texts.push(categLabel);
            }

            this.texts.push(distanceLabel, elevationLabel, avgGradeLabel);
        });

        this.add(...this.texts, ...this.polys);
        if (isRide) {
            this.add(...this.svgs);
            this.add(...this.rects);
            this.rects.forEach(r => this.moveObjectTo(r, 0));
        }

        this.left = this.lastLeft;
        this.top = this.lastTop;
        this.setCoords();
        this.canvas?.requestRenderAll();
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
        this.polys.forEach(p => p.setStrokeStop(idx, color));
        this.rects.forEach(p => p.setStrokeStop(idx, color));
        this.climbsTheme.stroke[idx] = color;

        this.setDirty();
    }
    public setFillStop(idx: number, color: string): void {
        this.gradient.setFillStop(idx, color);
        this.polys.forEach(p => p.setFillStop(idx, color));
        this.rects.forEach(p => p.setFillStop(idx, color));
        this.climbsTheme.fill[idx] = color;

        this.setDirty();
    }
    public setTextGradient(color1: string, color2?: string) {
        this.gradientTextColor.setFillStop(0, color1);
        this.gradientTextColor.setFillStop(1, color2 ?? color1);
        this.climbsTheme.textColor[0] = color1;
        this.climbsTheme.textColor[1] = color2 ?? color1;

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
        this.polys.forEach(item => {
            item.setDirty();
        });

        this.rects.forEach(item => {
            item.setDirty();
        });

        [this.texts].forEach(objs => objs.forEach(item => {
            item.dirty = true;
            item.initDimensions();
            item.setCoords();
        }));

        this.dirty = true;
        this.setCoords();
    }

    public async startAnimation(): Promise<util.TAnimation<number>[] | null> {
        let animations: util.TAnimation<number>[] = [];

        await this.createClimbsChart();

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

        this.polys.forEach((obj, i) => {
            obj.animationSettings.duration = this.animationSettings.duration;
            let anims = obj.startAnimation();
            if (anims)
                animations.push(...anims);
        });

        return animations;
    }
}
