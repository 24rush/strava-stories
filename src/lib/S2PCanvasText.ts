import { IText } from 'fabric'
import { type S2PCanvasItem, S2PCanvasItemType } from './S2PCanvasItem';
import type { S2PThemeText } from './S2PTheme';

export class S2PCanvasText extends IText implements S2PCanvasItem {
    private label_: string;

    private id_ = `${Math.random().toString(36).slice(2, 9)}`;

    constructor(textProps: S2PThemeText) {
        super(textProps.value ?? "", {
            fontSize: textProps.fontSize,
            fontFamily: textProps.fontFamily,
            fill: textProps.fill,
            stroke: textProps.stroke,
            strokeWidth: textProps.strokeWidth,
            angle: textProps.angle,
            width: 200,
            originX: "center",
            originY: "center",
            scaleX: textProps.scaleX,
            scaleY: textProps.scaleY,          
        });

        this.label_ = textProps.label;
        this.s2pType = S2PCanvasItemType.Text;
    }

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Text;

    get id(): string { return this.id_; }
    get label(): string { return this.label_; }

    setPosition(left: number, top: number) {
        this.top = top;
        this.left = left;
    }

    get strokeColor(): string {
        return this.get("stroke");
    }

    set strokeColor(color: string) {
        this.set("stroke", color);
    }

    set scaling(value: number) {
        this.scale(value);
    }
}