import { Rect } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem } from "./S2PCanvasItem";

export class S2PRect extends Rect implements S2PCanvasItem {
    s2pType: S2PCanvasItemType;

    constructor(...args: any[]) {
        super(...args);

        this.s2pType = S2PCanvasItemType.Rect;
    }
}