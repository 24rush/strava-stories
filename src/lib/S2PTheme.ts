import { S2PCanvasItemFeature, type FeatureHandlers } from "./S2PCanvasItem";

export class S2PThemeObject {
    public label: string = "user";

    public top: number = 0;
    public left: number = 0;

    public width: number = 0;
    public height: number = 0;

    public angle: number = 0;

    public fill: (string | null)[] = ["#fff", "#fff"];
    public stroke: (string | null)[] = ["#fff", "#fff"];
    public strokeWidth: number = 1;

    public scaleX: number = 1;
    public scaleY: number = 1;

    public barHeight: number = 15;
    public barGap: number = 5;

    public rx: number = 0;
    public ry: number = 0;

    public fontFamily: string = "Kanit";
    public fontStyle: string = "normal";
    public fontWeight: string | number = 400;
    public fontSize: number = 30;

    public charSpacing: number = 0;
    public value: string | undefined = "";

    public textColor: (string | null)[] = ["#fff", "#fff"];

    public url: string = "";

    constructor(other: Record<any, any>) {
        Object.assign(this, other);
    }

    setProperty<K extends keyof FeatureHandlers>(
        property: K,
        ...args: FeatureHandlers[K]['set']
    ) {

        let [val] = args;

        switch (property) {
            case S2PCanvasItemFeature.Label:
                this.label = val as string;
                break;
            case S2PCanvasItemFeature.Rx:
            case S2PCanvasItemFeature.Ry:
                this.rx = val as number;
                this.ry = val as number;
                break;
            case S2PCanvasItemFeature.BarHeight:
                this.barHeight = val as number;
                break;
            case S2PCanvasItemFeature.BarGap:
                this.barGap = val as number;
                break;
            case S2PCanvasItemFeature.FontFamily:
                this.fontFamily = val as string;
                break;
            case S2PCanvasItemFeature.FontStyle:
                this.fontStyle = val as string;
                break;
            case S2PCanvasItemFeature.FontWeight:
                this.fontWeight = val;
                break;
            case S2PCanvasItemFeature.FontSize:
                this.fontSize = val as number;
                break;
            case S2PCanvasItemFeature.StrokeWidth:
                this.strokeWidth = val as number;
                break;
            case S2PCanvasItemFeature.CharSpacing:
                this.charSpacing = val as number;
                break;
            case S2PCanvasItemFeature.Url:
                this.url = val as string;
                break;
        }
    }
}

export class S2PTheme {
    public name: string = "";
    public ignore: boolean = false;
    public texts: S2PThemeObject[] = [];
    public polys: S2PThemeObject[] = [];
    public rects: S2PThemeObject[] = [];
    public svgs: S2PThemeObject[] = [];
    public splits: S2PThemeObject[] = [];
    public climbs: S2PThemeObject[] = [];

    public height_percentage: number = 1;
    public devicePixelRatio: number = 1;

    constructor(name: string) {
        this.name = name;
    }
}