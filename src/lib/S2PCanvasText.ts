import { IText } from 'fabric'
import { type S2PCanvasItem, S2PCanvasItemType } from './S2PCanvasItem';
import { S2PThemeText } from './S2PTheme';

export class S2PCanvasText extends IText implements S2PCanvasItem {
    private label_: string;

    private id_ = `${Math.random().toString(36).slice(2, 9)}`;

    constructor(textProps: S2PThemeText) {
        super(textProps.value ?? "", {
            fontSize: textProps.fontSize,
            fontFamily: textProps.fontFamily,
            fontWeight: textProps.fontWeight,
            charSpacing: textProps.charSpacing ?? 0,
            fontStyle: textProps.fontStyle,
            fill: textProps.fill,
            stroke: textProps.stroke,
            strokeWidth: textProps.strokeWidth,
            angle: textProps.angle,
            width: 200,
            originX: "left",
            originY: "top",
            scaleX: textProps.scaleX,
            scaleY: textProps.scaleY
        });

        this.id_ = (!textProps.id || textProps.id == "") ? this.id_ : textProps.id;
        this.label_ = textProps.label;
        this.s2pType = S2PCanvasItemType.Text;

        this.objectCaching = false;
    }

    s2pType: S2PCanvasItemType = S2PCanvasItemType.Text;

    get id(): string { return this.id_; }
    set id(value: string) { this.id_ = value; }

    get label(): string { return this.label_; }
    get textProps() : S2PThemeText {
        return {
            ...new S2PThemeText(),
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            charSpacing: this.charSpacing,

            scaleX: this.scaleX,
            scaleY: this.scaleY,
            angle: this.angle,

            originX: "left",
            originY: "top",

            fill: this.fill,
            stroke: this.stroke,
            strokeWidth: this.strokeWidth
        };
    }

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