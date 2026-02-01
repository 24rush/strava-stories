import { FabricObject, Gradient, Group, util } from "fabric";
import { S2PCanvasItemType, type S2PCanvasItem, type FeatureHandlers, S2PCanvasItemFeature, PropertyExtender } from "./S2PCanvasItem";
import { S2PThemeObject } from "./S2PTheme";

export class S2PSvg extends Group implements S2PCanvasItem {
    s2pType: S2PCanvasItemType = S2PCanvasItemType.Svg;

    private svgTheme: S2PThemeObject | undefined;

    constructor(objects: (FabricObject | null)[], options: Record<string, any>, themeSvgProps?: S2PThemeObject) {
        super();
        PropertyExtender.attachPropertiesTyped(this, this.featureList);

        this.svgTheme = new S2PThemeObject(themeSvgProps ?? {});

        if (!objects) return;

        const targetWidth = themeSvgProps?.width ?? 60;
        const targetHeight = themeSvgProps?.height ?? 60;

        objects.forEach((obj) => {
            if (!obj) return;
            if (obj.stroke == "#000000") obj.stroke = "#fff";

            if (obj.fill == "#000000" || obj.fill == "rgb(0,0,0)") obj.fill = "#fff";
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
            left + (targetWidth - svgGroup.width * svgGroup.scaleX) / 2;
        const leftoverY =
            top + (targetHeight - svgGroup.height * svgGroup.scaleY) / 2;

        svgGroup.left = leftoverX;
        svgGroup.top = leftoverY;
        svgGroup.angle = themeSvgProps ? themeSvgProps.angle : 0;

        svgGroup.setCoords();

        this.scaleX = svgGroup.scaleX;
        this.scaleY = svgGroup.scaleY;
        this.angle = svgGroup.angle;

        super.add(svgGroup);
    }

    private featureList: S2PCanvasItemFeature[] = [
        S2PCanvasItemFeature.Label,        
        S2PCanvasItemFeature.Url,
    ];

    hasProperty(feature: S2PCanvasItemFeature): boolean {
        return this.featureList.includes(feature);
    }
    
    getProperty<K extends keyof FeatureHandlers>(
        property: K
    ): FeatureHandlers[K]['get'] {
        if (!this.svgTheme || !this.hasProperty(property as S2PCanvasItemFeature))
            throw `Unsupported property ${property}, should not be called`;

        return this.svgTheme[property];
    }

   setProperty<K extends keyof FeatureHandlers>(
        property: K,
        ...args: FeatureHandlers[K]['set']
    ) {
        if (!this.svgTheme || !this.hasProperty(property as S2PCanvasItemFeature))
            throw 'Unsupported property, should not be called';

        this.svgTheme.setProperty(property, ...args);
    }
    
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