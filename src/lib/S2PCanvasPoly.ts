import { Group, Polygon, Polyline } from "fabric";
import type { XYPoint } from "./geometry/polyline";
import { type S2PCanvasItem, S2PCanvasItemType } from "./S2PCanvasItem";

export class S2PCanvasPoly extends Group implements S2PCanvasItem {
    private polylineObj: Polyline | undefined;
    private polygonObj: Polygon | undefined;

    private maxWidth: number = 0;
    private maxHeight: number = 0;
    private left_: number = 0;
    private top_: number = 0;
    private label_: string = "";

    constructor(label: string, maxWidth: number, maxHeight: number, top: number, left: number) {
        super();
        this.label_ = label;
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.top_ = top;
        this.left_ = left;
    }

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Polyline;

    get label(): string { return this.label_; }

    get stroke(): string {
        if (this.polylineObj) return this.polylineObj.get("stroke");
        return "#fc5200";
    }

    set stroke(color: string) {
        if (this.polylineObj) this.polylineObj.set("stroke", color);
    }

    get fill(): string {
        return this.polygonObj ? this.polygonObj.get("fill") : "#fc5200";
    }

    set fill(color: string) {
        if (this.polygonObj) this.polygonObj.set("fill", color);
    }

    set strokeWidth(width: number) {
        if (this.polylineObj) {
            this.polylineObj.set("strokeWidth", width);
            this.polylineObj.setCoords();
        }
    }

    get strokeWidth(): number {
        return this.polylineObj ? this.polylineObj.get("strokeWidth") : 4;        
    }

    createPolyline(points: XYPoint[]) {
        this.s2pType = S2PCanvasItemType.Polyline;

        this.polylineObj = new Polyline(points, {
            stroke: "#fc5200",
            strokeWidth: 4,
        });

        this.add(this.polylineObj);

        this.top = this.top_;
        this.left = this.left_;
        this.s2pType = S2PCanvasItemType.Polyline;
    }

    createFilledPolyline(points: XYPoint[]) {
        this.s2pType = S2PCanvasItemType.FilledPolyline;

        this.polylineObj = new Polyline(points, {
            stroke: "#fc5200",
            strokeWidth: 2,
            fill: null,
        });

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

        this.polygonObj = new Polygon(fillPoints, {
            fill: "rgba(0, 128, 255, 0.2)", // Light blue fill                                   
        });

        this.add(this.polylineObj, this.polygonObj);
        this.top = this.top_;
        this.left = this.left_;
        this.s2pType = S2PCanvasItemType.FilledPolyline;
    }
}