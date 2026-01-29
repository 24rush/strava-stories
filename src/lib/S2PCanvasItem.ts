import { util, type Gradient } from "fabric";
import type { S2PCanvasText } from "./S2PCanvasText";
import type { S2PCanvasPoly } from "./S2PCanvasPoly";
import type { S2PRect } from "./S2PRect";
import type { S2PSvg } from "./S2PSvg";

export enum S2PCanvasItemType {
    Unknown = "unknown",

    Polyline = "polyline",
    FilledPolyline = "filledPolyline",
    Text = "text",
    Rect = "rect",
    Splits = "splits",
    Svg = "svg"
}

export interface S2PCanvasItem {
    s2pType: S2PCanvasItemType;

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
    startAnimation(): util.TAnimation<number>[] | null;
}