<script lang="ts">
    import {
        Canvas,
        FabricObject,
        Group,
        Pattern,
        Polyline,
        FabricImage,
    } from "fabric";
    import {
        decodePolyline,
        generateXYFromLatLng,
        generateXYFromPoints,
        mercatorProject,
    } from "../lib/geometry/polyline";

    import type { LatLng } from "../lib/geometry/LatLng";
    import { onMount } from "svelte";
    import { S2PCanvasText } from "../lib/S2PCanvasText";
    import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
    import { S2PTheme, S2PThemePoly, S2PThemeText } from "../lib/S2PTheme";
    import { S2PRect } from "../lib/S2PRect";

    let {
        onSelectionChanged,
    }: {
        onSelectionChanged?: (
            selectedObj:
                | S2PCanvasText
                | S2PCanvasPoly
                | FabricObject
                | undefined,
        ) => void;
    } = $props();

    let canvasEl: HTMLCanvasElement;
    let canvas: Canvas;
    let canvasPadding = 20;

    let polys: Group[] = [];
    let texts: S2PCanvasText[] = [];
    let svgs: FabricObject[] = [];

    let rndId = `${Math.random().toString(36).slice(2, 9)}`;

    let lastPos: number = 0;
    const minCanvasHeight = Math.max(window.innerHeight * 0.5, 300);

    let resizer: HTMLButtonElement;
    let container: HTMLDivElement;

    onMount(() => {
        canvasEl.id = `mapCanvas-${rndId}`;
        canvas = new Canvas(canvasEl.id, {
            backgroundColor: "#fff",
        });

        if (
            canvas.lowerCanvasEl.parentElement &&
            canvas.lowerCanvasEl.parentElement.parentElement
        ) {
            let container =
                canvas.lowerCanvasEl.parentElement.parentElement.parentElement;
            canvas.setDimensions({
                width: container.clientWidth,
                height: minCanvasHeight,
            });
            canvas.requestRenderAll();
        }

        setCheckeredBackground();

        canvas.on("selection:created", (e) => {
            onSelectionChanged?.(e.selected[0]);
        });

        canvas.on("selection:updated", (e) => {
            onSelectionChanged?.(e.selected[0]);
        });

        canvas.on("selection:cleared", () => {
            onSelectionChanged?.(undefined);
        });

        // Disable Fabric's default touch-blocking
        canvas.allowTouchScrolling = true;

        // Fabric sets a touch-action CSS rule based on this flag
        canvas.upperCanvasEl.style.touchAction = "auto";

        let isDragging = false;

        const startDrag = () => {
            isDragging = true;
            document.body.style.userSelect = "none"; // prevent text highlighting
        };

        const doDrag = (clientY: number) => {
            if (!isDragging) return;
            const rect = container.getBoundingClientRect();
            const newHeight = clientY - rect.top;

            canvas.setDimensions({
                height: newHeight,
            });
        };

        const stopDrag = () => {
            isDragging = false;
            document.body.style.userSelect = "";
        };

        // Desktop events
        resizer.addEventListener("mousedown", (e) => startDrag());
        document.addEventListener("mousemove", (e) => doDrag(e.clientY));
        document.addEventListener("mouseup", stopDrag);

        // Mobile events
        resizer.addEventListener("touchstart", (e) => {
            startDrag();
        });
        document.addEventListener("touchmove", (e) => {
            if (!e || !e.touches.length || !e.touches[0]) return;
            doDrag(e.touches[0].clientY);
        });
        document.addEventListener("touchend", stopDrag);

        document.fonts.ready.then(() => {
            canvas.requestRenderAll();
        });
    });

    export function onFontScalingChanged(event: any) {
        texts.forEach((text: S2PCanvasText) => {
            text.scaling = event.target.value as number;
        });
        canvas.requestRenderAll();
    }

    export function unselectAll() {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }

    export function getCanvas(): Canvas {
        return canvas;
    }

    export function clear() {
        canvas.remove(...canvas.getObjects());
        texts = [];
        polys = [];
        svgs = [];
        lastPos = 0;        
        canvas.requestRenderAll();
    }

    export function addSvg(obj: FabricObject) {
        canvas.add(obj);
        svgs.push(obj);
    }

    export function removeSvg(obj: FabricObject) {
        canvas.remove(obj);
        svgs = svgs.filter((svg) => svg != obj);
    }

    export function addText(textProps: S2PThemeText): S2PCanvasText {
        let s2pCanvasText = new S2PCanvasText(textProps);
        s2pCanvasText.setPosition(textProps.left, textProps.top);

        texts.push(s2pCanvasText);
        canvas.add(s2pCanvasText);
        canvas.setActiveObject(s2pCanvasText);

        adjustCanvasSize();
        canvas.requestRenderAll();

        return s2pCanvasText;
    }

    export function addRect(...args: any[]) {
        let rect = new S2PRect(...args);
        canvas.add(rect);
        canvas.sendObjectToBack(rect);
        canvas.setActiveObject(rect);
    }

    export function remove(
        delItem: S2PCanvasText | S2PCanvasPoly | FabricObject,
    ) {
        canvas.remove(delItem);

        if (delItem instanceof S2PCanvasText)
            texts = texts.filter((text) => text.id !== delItem.id);
    }

    export async function loadBackground(fileUrl: any): Promise<boolean> {
        let img = await FabricImage.fromURL(
            fileUrl,
            {},
            {
                originX: "center",
                originY: "center",
                left: canvas.width / 2,
                top: canvas.height / 2,
            },
        );

        if (!img) return false;

        const scale = Math.min(
            canvas.width / img.width,
            canvas.height / img.height,
        );

        img.scaleX = scale;
        img.scaleY = scale;
        canvas.backgroundImage = img;
        canvas.requestRenderAll();

        return true;
    }

    export function removeBackground() {
        canvas.backgroundImage = null;
        canvas.requestRenderAll();
    }

    export function exportToPng() {
        canvas.lowerCanvasEl.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "canvas-export.png";
            link.click();
            URL.revokeObjectURL(url);
        }, "image/png");
    }

    export function dump() {
        let theme: S2PTheme = new S2PTheme("default");

        texts.forEach((text) => {
            let text_meta: S2PThemeText = {
                label: text.label,
                left: text.left / canvas.width,
                top: text.top / canvas.height,
                fontSize: text.fontSize,
                fontFamily: text.fontFamily,
                scaleX: text.scaleX,
                scaleY: text.scaleY,

                angle: text.angle,
                stroke: text.stroke,
                strokeWidth: text.strokeWidth,
                fill: text.fill,
            };

            if (!text.label.includes("_value")) text_meta.value = text.text;

            theme.texts.push(text_meta);
        });

        polys.forEach((poly) => {
            theme.polys.push({
                //@ts-ignore
                label: poly.label,
                left: poly.left / canvas.width,
                top: poly.top / canvas.height,
                angle: poly.angle,
                stroke: poly.stroke,
                strokeWidth: poly.strokeWidth,
                fill: poly.fill,
                scaleX: poly.scaleX,
                scaleY: poly.scaleY,
            });
        });

        svgs.forEach((svgGroup) => {
            theme.svgs.push({
                //@ts-ignore
                label: svgGroup.label,
                left: svgGroup.left / canvas.width,
                top: svgGroup.top / canvas.height,
                //@ts-ignore
                url: svgGroup.url,
                angle: svgGroup.angle,
                stroke: svgGroup.stroke,
                strokeWidth: svgGroup.strokeWidth,
                fill: svgGroup.fill,
                scaleX: svgGroup.scaleX,
                scaleY: svgGroup.scaleY,
            });
        });

        theme.height_percentage = canvas.height / canvas.width;

        console.log(JSON.stringify(theme));
    }

    function setCheckeredBackground() {
        // Create checkered pattern tile using a temporary canvas
        const tileSize = 120;
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height = tileSize;
        const ctx = patternCanvas.getContext("2d");

        if (!ctx) return;

        // Draw checker pattern (2 colors)
        ctx.fillStyle = "#525252"; // light gray
        ctx.fillRect(0, 0, tileSize, tileSize);
        ctx.fillStyle = "#0000006B"; // lighter gray
        ctx.fillRect(0, 0, tileSize / 2, tileSize / 2);
        ctx.fillRect(tileSize / 2, tileSize / 2, tileSize / 2, tileSize / 2);

        // Create Fabric pattern from the tile
        const pattern = new Pattern({
            source: patternCanvas,
            repeat: "repeat",
        });

        // Apply it as background
        canvas.backgroundColor = pattern;
        canvas.requestRenderAll();
    }

    function adjustCanvasSize() {
        if (texts.length == 0) return;

        lastPos =
            texts[texts.length - 1].top + texts[texts.length - 1].fontSize / 2;

        //canvas.setDimensions({ height: desiredCanvasHeight });
        if (canvas.height < Math.max(lastPos, minCanvasHeight)) {
            canvas.setDimensions({
                height: Math.max(lastPos, minCanvasHeight),
            });
            setCheckeredBackground();
            canvas.renderAll();
        }
    }

    function drawPolyline(polyline: string) {
        const rawPoints = decodePolyline(polyline);

        const { points, width, height } = mercatorProject(
            rawPoints,
            canvas.getWidth(),
        );

        // Resize canvas
        canvas.width = width;
        canvas.height = height;

        // Draw polyline
        if (points.length > 0) {
            polylineObj = new Polyline(points, {
                stroke: "#fc5200",
                strokeWidth: 4,
                fill: "",
                strokeLineJoin: "round",
                strokeLineCap: "round",
            });

            canvas.add(polylineObj);
        }

        canvas.renderAll();
    }

    export function addFilledPolyFromVector(
        label: string,
        elevations: number[],
        poly: S2PThemePoly,
    ): Group | undefined {
        if (!elevations.length) return;

        let points = generateXYFromPoints(elevations, canvas.getWidth(), 40);

        let filledPoly = new S2PCanvasPoly(
            label,
            canvas.getWidth(),
            60 - canvasPadding,
            poly.top,
            poly.left,
        );

        filledPoly.createFilledPolyline(points);
        filledPoly.scaleX = poly.scaleX;
        filledPoly.scaleY = poly.scaleY;
        filledPoly.angle = poly.angle;

        polys.push(filledPoly);
        canvas.add(filledPoly);
        canvas.renderAll();
    }

    export function addPolyFromLatLngs(
        label: string,
        trackPoints: LatLng[],
        poly: S2PThemePoly,
    ): Group | undefined {
        if (!trackPoints.length) return;

        const projectedPoints = generateXYFromLatLng(
            trackPoints,
            canvas.getWidth(),
            canvas.getHeight(),
        );

        canvas.setDimensions({
            height: projectedPoints.height + 20,
            width: projectedPoints.width,
        });
        canvas.renderAll();

        let polyline = new S2PCanvasPoly(
            label,
            canvas.getWidth(),
            canvas.getHeight(),
            poly.top,
            poly.left,
        );

        polyline.createPolyline(projectedPoints.pts);
        polyline.scaleX = poly.scaleX;
        polyline.scaleY = poly.scaleY;
        polyline.angle = poly.angle;

        polys.push(polyline);
        canvas.add(polyline);
        canvas.renderAll();
    }
</script>

<div
    bind:this={container}
    class="mb-2"
    style="display: flex; flex-direction: column; align-items: center; justify-content: center;"
>
    <canvas bind:this={canvasEl}></canvas>
    <button
        class="btn btn-sm btn-primary"
        id="resizer"
        bind:this={resizer}
        style="text-align: center;"
    >
        <i class="bi bi-arrows-vertical"></i>
    </button>
</div>

<style>
    #resizer {
        border-radius: 0;
        cursor: row-resize;
        width: 100%;
        padding: 0px;
        touch-action: none; /* prevent scrolling while dragging */
    }
</style>
