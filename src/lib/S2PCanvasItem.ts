import { util, type Gradient } from "fabric";
import type { S2PCanvasText } from "./S2PCanvasText";
import type { S2PCanvasPoly } from "./S2PCanvasPoly";
import type { S2PRect } from "./S2PRect";
import type { S2PSvg } from "./S2PSvg";

export enum S2PCanvasItemFeature {
    Label = "label",
    
    Rx = "rx",
    Ry = "ry",

    BarHeight = "barHeight",
    BarGap = "barGap",

    FontSize = "fontSize",
    FontFamily = "fontFamily",
    FontStyle = "fontStyle",
    FontWeight = "fontWeight",
    CharSpacing = "charSpacing",
    StrokeWidth = "strokeWidth",

    Stroke = "stroke",
    Fill = "fill",

    Url = "url",
}

type intGetterSetter = {
    set: [v: number];
    get: number;
};

type stringGetterSetter = {
    set: [v: string];
    get: string;
};

type stringOrNumberGetterSetter = {
    set: [v: string | number];
    get: string | number;
};

export type FeatureHandlers = {
    label: stringGetterSetter,

    rx: intGetterSetter,
    ry: intGetterSetter,

    barHeight: intGetterSetter,
    barGap: intGetterSetter,

    fontSize: intGetterSetter,
    fontFamily: stringGetterSetter,
    fontStyle: stringGetterSetter,
    fontWeight: stringOrNumberGetterSetter,
    charSpacing: intGetterSetter,

    strokeWidth: intGetterSetter,
    url: stringGetterSetter,
};

type Props = {
    [K in keyof FeatureHandlers]: FeatureHandlers[K]["get"];
};

export enum S2PCanvasItemType {
    Unknown = "unknown",

    Polyline = "polyline",
    FilledPolyline = "filledPolyline",
    Text = "text",
    Rect = "rect",
    Splits = "splits",
    Svg = "svg",
    Climbs = "climbs"
}

export class PropertyExtender {
    static attachPropertiesTyped<T extends object>(
        obj: T, props: S2PCanvasItemFeature[]
    ): asserts obj is T & Props {
        (Object.values(props) as (keyof FeatureHandlers)[]).forEach((key) => {
            Object.defineProperty(obj, key, {
                configurable: true,
                enumerable: true,
                get() {
                    return this.getProperty(key) as any;
                },
                set(value) {
                    this.setProperty(key, value);
                },
            });
        });
    }
}

export interface S2PCanvasItem {
    s2pType: S2PCanvasItemType;

    hasProperty(feature: S2PCanvasItemFeature): boolean;

    getProperty<K extends keyof FeatureHandlers>(
        property: K
    ): FeatureHandlers[K]['get'];

    setProperty<K extends keyof FeatureHandlers>(
        property: K,
        ...args: FeatureHandlers[K]['set']
    ): void;

    getStrokeStop(idx: number): string | null;
    getFillStop(idx: number): string | null;

    setStrokeStop(idx: number, color: string): void;
    setFillStop(idx: number, color: string): void;

    resetColor(): void;

    get strokeGradient(): Gradient<unknown, "linear">;
    get fillGradient(): Gradient<unknown, "linear">;
}

export type S2PCanvasObjectType = S2PCanvasText | S2PCanvasPoly | S2PRect | S2PSvg;

export class S2PAnimationSettings {
    duration: number = 1000;
    easing: util.TEasingFunction = util.ease.defaultEasing;
}

export interface S2PAnimatedCanvasObject {
    get animationSettings(): S2PAnimationSettings;
    startAnimation(): util.TAnimation<number>[] | null;
}