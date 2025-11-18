export enum S2PCanvasItemType {
    Unknown = "unknown",

    Polyline = "polyline",
    FilledPolyline = "filledPolyline",
    Text = "text",
    Rect = "rect",
    Svg = "svg"
}

export interface S2PCanvasItem {
    s2pType: S2PCanvasItemType;
}