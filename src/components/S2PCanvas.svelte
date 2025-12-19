<script lang="ts">
    import {
        Canvas,
        FabricObject,
        Group,
        Pattern,
        FabricImage,
        ActiveSelection,
    } from "fabric";
    import {
        generateXYFromLatLng,
        generateXYFromPoints,
    } from "../lib/geometry/polyline";

    import type { LatLng } from "../lib/geometry/LatLng";
    import { onMount } from "svelte";
    import { S2PCanvasText } from "../lib/S2PCanvasText";
    import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
    import {
        S2PTheme,
        S2PThemePoly,
        S2PThemeRect,
        S2PThemeText,
    } from "../lib/S2PTheme";
    import { S2PRect } from "../lib/S2PRect";
    import type { S2PSvg } from "../lib/S2PSvg";

    let {
        onSelectionChanged,
    }: {
        onSelectionChanged: (selectedObj: FabricObject[]) => void;
    } = $props();

    let canvasEl: HTMLCanvasElement;
    let canvas: Canvas;
    let canvasPadding = 20;

    let polys: S2PCanvasPoly[] = [];
    let texts: S2PCanvasText[] = [];
    let rects: S2PRect[] = [];
    let svgs: S2PSvg[] = [];

    let rndId = `${Math.random().toString(36).slice(2, 9)}`;

    let lastPos: number = 0;
    const minCanvasHeight = Math.max(window.innerHeight * 0.5, 350);

    let resizer: HTMLButtonElement;
    let container: HTMLDivElement;

    let shouldShowGuides: boolean = false;

    onMount(() => {
        canvasEl.id = `mapCanvas-${rndId}`;
        canvas = new Canvas(canvasEl.id, {
            backgroundColor: "#fff",
            selection: false, // disable drag selection if you want ctrl-click only
            preserveObjectStacking: true, // important for multi-selection
            enableRetinaScaling: true,
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

        let selected: FabricObject[] = [];

        canvas.on("mouse:down", function (opt) {
            const target = opt.target;

            if (opt.e.shiftKey && target) {
                // Add to selection
                if (!selected.includes(target)) selected.push(target);

                const sel = new ActiveSelection(selected, { canvas });
                canvas.setActiveObject(sel);
            } else if (target) {
                // New single selection
                selected = [target];
            } else {
                // Clicked empty space
                selected = [];
            }

            canvas.requestRenderAll();
        });

        canvas.on("selection:created", (e) => {
            onSelectionChanged(e.selected);
        });

        canvas.on("selection:updated", (e) => {
            onSelectionChanged(e.selected);
        });

        canvas.on("selection:cleared", () => {
            onSelectionChanged([]);
        });

        // Disable Fabric's default touch-blocking
        canvas.allowTouchScrolling = false;

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
        document.addEventListener("keydown", function (e) {
            if (e.key === "Delete" || e.key === "Backspace") {
                const obj = canvas.getActiveObject();
                if (obj && obj.isEditing) return;

                deleteActiveObjects();
            }
        });

        window.addEventListener("beforeunload", function (e) {
            e.preventDefault(); // required for some browsers
            e.returnValue = ""; // triggers the browser's confirmation dialog
        });

        let MOVE_STEP = 1;

        document.addEventListener("keydown", function (e) {
            const obj = canvas.getActiveObject();
            if (!obj) return;

            let changed = false;

            switch (e.key) {
                case "ArrowLeft":
                    obj.left -= MOVE_STEP;
                    changed = true;
                    break;
                case "ArrowRight":
                    obj.left += MOVE_STEP;
                    changed = true;
                    break;
                case "ArrowUp":
                    obj.top -= MOVE_STEP;
                    changed = true;
                    break;
                case "ArrowDown":
                    obj.top += MOVE_STEP;
                    changed = true;
                    break;
            }

            if (changed) {
                obj.setCoords();
                let textMoved = texts.find((t) => t == obj);
                if (textMoved) textMoved.showGuides();
                canvas.requestRenderAll();
                e.preventDefault();
            }
        });

        canvas.on("object:moving", (e) => {
            const target = e.target;
            if (target && target.type === "activeselection") {
                let selection = canvas.getActiveObjects();
                selection.forEach((obj) => {
                    if (obj instanceof S2PCanvasText) {
                        obj.showGuides();
                    }
                });
            }
        });
    });

    export function setFontFamily(fontFamily: string) {
        texts.forEach((t) => {
            t.set("fontFamily", fontFamily);
        });
    }

    export function setAccentColor(color: string) {
        const active = canvas.getActiveObjects();

        if (active.length) {
            active.forEach((obj) => {
                if (obj instanceof S2PCanvasText) {
                    obj.setFillStop(0, color);
                    obj.setFillStop(1, color);
                }
            });
        } else {
            texts.forEach((t) => {
                t.setFillStop(0, color);
                t.setFillStop(1, color);
            });
        }

        canvas.requestRenderAll();
    }

    export function setShowGuides(checked: boolean) {
        texts.forEach((t) => t.setShowGuides(checked));
    }

    export function unselectAll() {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }

    export function selectAll() {
        canvas.discardActiveObject();
        const objects = canvas.getObjects().filter((obj) => obj.type != "line");

        const selection = new ActiveSelection(objects, {
            canvas: canvas,
        });

        canvas.setActiveObject(selection);
        canvas.requestRenderAll();
    }

    export function getCanvas(): Canvas {
        return canvas;
    }

    export function clear() {
        canvas.remove(...canvas.getObjects());
        texts = [];
        polys = [];
        rects = [];
        svgs = [];
        lastPos = 0;

        canvas.requestRenderAll();
    }

    export function addSvg(obj: S2PSvg) {
        canvas.add(obj);
        svgs.push(obj);

        adjustCanvasSize();
    }

    export function addText(textProps: S2PThemeText): S2PCanvasText {
        let s2pCanvasText = new S2PCanvasText(textProps, canvas);
        s2pCanvasText.setPosition(textProps.left, textProps.top);

        texts.push(s2pCanvasText);
        canvas.add(s2pCanvasText);
        s2pCanvasText.auxItems.forEach((ai) => canvas.add(ai));
        s2pCanvasText.setShowGuides(shouldShowGuides);

        adjustCanvasSize();
        canvas.requestRenderAll();

        return s2pCanvasText;
    }

    export function onShowGuidesChanged(event: any) {
        shouldShowGuides = event.target.checked;
        setShowGuides(shouldShowGuides);
    }

    export function addTextAtPos(
        text: string,
        left: number,
        top: number,
        textPropsCopy?: S2PThemeText,
    ): S2PCanvasText {
        let textProps: S2PThemeText | undefined = textPropsCopy;

        if (!textProps && texts.length > 0)
            textProps = {
                ...(texts[texts.length - 1]?.textProps ?? new S2PThemeText()),
            };

        if (!textProps) textProps = new S2PThemeText();

        textProps.value = text;
        textProps.left = left;
        textProps.top = top;

        let textObj = addText(textProps);
        canvas.setActiveObject(textObj);

        return textObj;
    }

    export function addRect(rectProps: S2PThemeRect) {
        let rect = new S2PRect(rectProps);
        rect.on("scaling", function () {
            const scaleX = rect.scaleX;
            const scaleY = rect.scaleY;

            // Resize the width/height permanently
            rect.set({
                width: rect.width * scaleX,
                height: rect.height * scaleY,
            });

            // Reset scale so strokeUniform still works
            rect.set({
                scaleX: 1,
                scaleY: 1,
            });

            // Restore rounded corners to stay visually constant
            rect.set({
                rx: rect.rx,
                ry: rect.ry,
            });

            canvas.renderAll();
        });

        rects.push(rect);
        canvas.add(rect);
        canvas.sendObjectToBack(rect);
        canvas.setActiveObject(rect);
        canvas.requestRenderAll();
    }

    export function deleteActiveObjects() {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach((obj) => remove(obj));
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }
    }

    export function remove(
        delItem:
            | S2PCanvasText
            | S2PCanvasPoly
            | S2PSvg
            | S2PRect
            | FabricObject,
    ) {
        if ("id" in delItem)
            texts = texts.filter((text) => text.id !== delItem.id);

        svgs = svgs.filter((svg) => svg != delItem);
        polys = polys.filter((poly) => poly != delItem);
        rects = rects.filter((rect) => rect != delItem);

        canvas.remove(delItem);
        canvas.requestRenderAll();
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

    function formatTimeHMS(timestamp: number) {
        return new Date(timestamp).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    export function exportToPng() {
        const originalBg = canvas.backgroundColor;
        const originalBgImg = canvas.backgroundImage;

        canvas.backgroundImage = null;
        canvas.backgroundColor = "";

        unselectAll();

        setTimeout(() => {
            canvas.lowerCanvasEl.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "strava-stories-" + formatTimeHMS(Date.now()) + ".png";
                link.click();
                URL.revokeObjectURL(url);
            }, "image/png");

            // restore
            canvas.backgroundColor = originalBg;

            if (originalBgImg) canvas.backgroundImage = originalBgImg;

            canvas.renderAll.bind(canvas);
            canvas.requestRenderAll();
        }, 400);
    }

    export function dump() {
        let theme: S2PTheme = new S2PTheme("default");

        texts.forEach((text) => {
            let text_meta: S2PThemeText = {
                ...new S2PThemeText(),
                id: text.id,
                label: text.label,
                left: text.left / canvas.width,
                top: text.top / canvas.height,
                fontSize: text.fontSize / canvas.width,
                fontFamily: text.fontFamily,
                fontWeight: text.fontWeight,
                charSpacing: text.charSpacing / (window.devicePixelRatio || 1),
                fontStyle: text.fontStyle,
                scaleX: text.scaleX,
                scaleY: text.scaleY,

                angle: text.angle,
                stroke: [text.getStrokeStop(0), text.getStrokeStop(1)],
                strokeWidth: text.strokeWidth,
                fill: [text.getFillStop(0), text.getFillStop(1)],
            };

            if (!text.label.includes("_value")) text_meta.value = text.text;

            theme.texts.push(text_meta);
        });

        polys.forEach((poly) => {
            theme.polys.push({
                ...new S2PThemePoly(),
                label: poly.label,
                left: poly.left / canvas.width,
                top: poly.top / canvas.height,
                angle: poly.angle,
                stroke: [poly.getStrokeStop(0), poly.getStrokeStop(1)],
                strokeWidth: poly.strokeWidth,
                fill: [poly.getFillStop(0), poly.getFillStop(1)],
                scaleX: poly.scaleX,
                scaleY: poly.scaleY,
            });
        });

        svgs.forEach((svgGroup) => {
            theme.svgs.push({
                left: svgGroup.left / canvas.width,
                top: svgGroup.top / canvas.height,
                width: (svgGroup.width * svgGroup.scaleX) / canvas.width,
                height: (svgGroup.height * svgGroup.scaleY) / canvas.height,
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

        rects.forEach((rect) => {
            theme.rects.push({
                ...new S2PThemeRect(),
                left: rect.left / canvas.width,
                top: rect.top / canvas.height,
                rx: rect.rx,
                ry: rect.ry,
                scaleX: rect.scaleX,
                scaleY: rect.scaleY,
                width: (rect.width * rect.scaleX) / canvas.width,
                height: (rect.height * rect.scaleY) / canvas.height,
                fill: [rect.getFillStop(0), rect.getFillStop(1)],
                stroke: [rect.getStrokeStop(0), rect.getStrokeStop(1)],
                strokeWidth: rect.strokeWidth,
                angle: rect.angle,
            });
        });

        theme.height_percentage = canvas.height / canvas.width;
        theme.devicePixelRatio = window.devicePixelRatio;

        console.log(JSON.stringify(theme));
    }

    function setCheckeredBackground() {
        // Create checkered pattern tile using a temporary canvas
        const tileSize = 32;
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = patternCanvas.height = tileSize;
        const ctx = patternCanvas.getContext("2d");

        if (!ctx) return;

        // Draw checker pattern (2 colors)
        ctx.fillStyle = "#187AFF"; // grid color
        let gridStrokeWidth = 1;
        ctx.fillRect(
            0,
            0,
            tileSize + gridStrokeWidth / 2,
            tileSize + gridStrokeWidth / 2,
        );
        ctx.fillStyle = "#3A3A3A";
        ctx.fillRect(
            0,
            0,
            tileSize - gridStrokeWidth / 2,
            tileSize - gridStrokeWidth / 2,
        );
        //ctx.fillRect(tileSize / 2, tileSize / 2, tileSize / 2, tileSize / 2);

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
        let lastPos = 0;
        [texts, polys, rects, svgs].forEach((col) => {
            lastPos = Math.max(
                lastPos,
                Math.max(
                    ...col.map((u) => {
                        let bb = u.getBoundingRect();
                        return bb.top + bb.height;
                    }),
                ),
            );
        });

        lastPos += canvasPadding;

        canvas.setDimensions({
            height: lastPos,
        });

        setCheckeredBackground();
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
            poly,
        );

        filledPoly.createFilledPolyline(points);
        filledPoly.scaleX = poly.scaleX;
        filledPoly.scaleY = poly.scaleY;
        filledPoly.strokeWidth = poly.strokeWidth;
        filledPoly.angle = poly.angle;

        polys.push(filledPoly);
        canvas.add(filledPoly);
        canvas.sendObjectToBack(filledPoly);

        adjustCanvasSize();
        canvas.renderAll();

        return filledPoly;
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

        let polyline = new S2PCanvasPoly(
            label,
            canvas.getWidth(),
            canvas.getHeight(),
            poly,
        );

        polyline.createPolyline(projectedPoints.pts);

        polyline.strokeWidth = poly.strokeWidth;
        polyline.scaleX = poly.scaleX;
        polyline.scaleY = poly.scaleY;
        polyline.angle = poly.angle;

        polys.push(polyline);
        canvas.add(polyline);
        canvas.sendObjectToBack(polyline);

        adjustCanvasSize();
        canvas.renderAll();

        return polyline;
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
