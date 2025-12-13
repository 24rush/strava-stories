import { FabricObject, Gradient, Group, util } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem } from "./S2PCanvasItem";
import type { S2PThemeSvg } from "./S2PTheme";

export class S2PSvg extends Group implements S2PCanvasItem {

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Svg;

    private url_: string = "";

    constructor(objects: (FabricObject|null)[], options: Record<string, any>, themeSvgProps?: S2PThemeSvg) {
        super();

        if (!objects) return;
        
        const targetWidth = themeSvgProps?.width ?? 60;
        const targetHeight = themeSvgProps?.height ?? 60;

        objects.forEach((obj) => {
            if (!obj) return;
            if (
                obj.fill == "rgb(0,0,0)" ||
                obj.stroke == "#000000" ||
                obj.fill == "#000000"
            ) {
                obj.stroke = "#fff";
                obj.fill = "#fff";
            }
        });

        var svgGroup = util.groupSVGElements(objects, options);

        // Choose the smaller scale to maintain aspect ratio (no stretching)
        const scale = Math.min(
            targetWidth / svgGroup.width,
            targetHeight / svgGroup.height,
        );

        svgGroup.scaleX = scale;
        svgGroup.scaleY = scale;

        const left = themeSvgProps ? themeSvgProps.left : 0;
        const top = themeSvgProps ? themeSvgProps.top : 0;

        // Optionally center the group within the target box
        // Calculate leftover space to center
        const leftoverX =
            left + (targetWidth - svgGroup.width * scale) / 2;
        const leftoverY =
            top + (targetHeight - svgGroup.height * scale) / 2;

        svgGroup.left = leftoverX;
        svgGroup.top = leftoverY;
        svgGroup.angle = themeSvgProps ? themeSvgProps.angle : 0;
        
        svgGroup.setCoords();

        super.add(svgGroup);
    }

    get url() { return this.url_; }
    set url(value: string) { this.url_ = value; }

    public getStrokeStop(idx: number): string | null {
        return null;        
    }
    public getFillStop(idx: number): string | null {
        return null;
    }
    public setStrokeStop(idx: number, color: string): void {        
    }

    public setFillStop(idx: number, color: string): void {    
    }

    get strokeGradient(): Gradient<unknown, "linear"> | null {        
        return null;
    }

    get fillGradient(): Gradient<unknown, "linear"> | null {    
        return null;
    }
}