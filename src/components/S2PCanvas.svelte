<script lang="ts">
    import {
        Canvas,
        FabricObject,
        Group,
        Pattern,
        FabricImage,
        ActiveSelection,    
        Rect,
        IText
    } from "fabric";
    import {
        generateXYFromLatLng,
        generateXYFromPoints,
    } from "../lib/geometry/polyline";
    import { FFmpeg, type FileData } from '@ffmpeg/ffmpeg';
    import { fetchFile } from '@ffmpeg/util';
    import type { LatLng } from "../lib/geometry/LatLng";
    import { onMount } from "svelte";
    import { S2PCanvasText } from "../lib/S2PCanvasText";
    import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
    import {
        S2PTheme,
        S2PThemeObject,
    } from "../lib/S2PTheme";
    import { S2PRect } from "../lib/S2PRect";
    import type { S2PSvg } from "../lib/S2PSvg";
    import type { SplitData } from "../lib/utils/fieldmappings";
    import { S2PSplits } from "../lib/S2PSplits";

    let {
        onSelectionChanged,
    }: {
        onSelectionChanged: (selectedObj: FabricObject[]) => void;
    } = $props();

    let canvasEl: HTMLCanvasElement;
    let canvas: Canvas;
    let canvasPadding = 20;
    let sliderHeight = $state(0);

    let polys: S2PCanvasPoly[] = [];
    let texts: S2PCanvasText[] = [];
    let rects: S2PRect[] = [];
    let splits: S2PSplits[] = [];
    let svgs: S2PSvg[] = [];

    let rndId = `${Math.random().toString(36).slice(2, 9)}`;

    let selected: FabricObject[] = $state([]);

    const minCanvasHeight = Math.max(window.innerHeight * 0.5, 350);

    let resizer: HTMLButtonElement;
    let container: HTMLDivElement;

    let rangeX: HTMLInputElement, rangeY: HTMLInputElement;

    let shouldShowGuides: boolean = false;
    const mimeType = "video/webm;codecs=vp9";

    onMount(() => {
        canvasEl.id = `mapCanvas-${rndId}`;

        canvas = new Canvas(canvasEl.id, {
            backgroundColor: "#000",
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

            setCanvasSize(container.clientWidth, minCanvasHeight);
            canvas.requestRenderAll();
        }

        setCheckeredBackground();

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

                let bb = target.getBoundingRect();
                rangeY.value = (bb.top + bb.height / 2).toString();
                rangeY.lastValue = rangeY.value;
                rangeX.value = (bb.left + bb.width / 2).toString();     
                rangeX.lastValue = rangeX.value
            } else {
                // Clicked empty space
                selected = [];
                resetSlidersToMedian();
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
            setCanvasSize(
                undefined,
                clientY - container.getBoundingClientRect().top,
            );
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
            }
        });

        window.addEventListener("beforeunload", function (e) {
            //e.preventDefault(); // required for some browsers
            //e.returnValue = ""; // triggers the browser's confirmation dialog
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
            } else {
                let bb = target.getBoundingRect();

                rangeY.value = (bb.top + bb.height / 2).toString();
                rangeX.value = (bb.left + bb.width / 2).toString();
            }
        });

        sliderHeight = canvas.height;
        rangeY.max = canvas.height.toString();
        rangeX.max = canvas.width.toString();
    });

    type S2PCanvasObjects = {
        texts: S2PCanvasText[];
        rects: S2PRect[];
        polys: S2PCanvasPoly[];
        splits: S2PSplits[];
        svgs: S2PSvg[];
    };

    export function getObjects(): S2PCanvasObjects {
        return { texts: texts, rects: rects, polys: polys, svgs: svgs, splits: splits };
    }

    export function setFontFamily(fontFamily: string) {
        [texts, splits].forEach(obj => obj.forEach((t) => {
            t.set("fontFamily", fontFamily);
        }));        
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
        splits = [];
        selected = [];

        canvas.requestRenderAll();
    }

    export function addSvg(obj: S2PSvg) {
        canvas.add(obj);
        svgs.push(obj);

        adjustCanvasSize();
    }

    export function addText(textProps: S2PThemeObject): S2PCanvasText {
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
        textPropsCopy?: S2PThemeObject,
    ): S2PCanvasText {
        let textProps: S2PThemeObject | undefined = textPropsCopy;

        if (!textProps && texts.length > 0)
            textProps = new S2PThemeObject(texts[texts.length - 1]?.textProps ?? {});            

        if (!textProps) textProps = new S2PThemeObject({});

        textProps.value = text;
        textProps.left = left;
        textProps.top = top;

        let textObj = addText(textProps);
        canvas.setActiveObject(textObj);

        return textObj;
    }

    export function addRect(rectProps: S2PThemeObject) : S2PRect {
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

        return rect;
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
        texts = texts.filter((text) => text !== delItem);
        svgs = svgs.filter((svg) => svg != delItem);
        polys = polys.filter((poly) => poly != delItem);
        rects = rects.filter((rect) => rect != delItem);
        splits = splits.filter((split) => split != delItem);

        canvas.remove(delItem);
        canvas.requestRenderAll();
    }

    export async function loadBackground(
        fileUrl: any,
    ): Promise<FabricImage | null> {
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

        if (!img) return null;

        canvas.backgroundImage = img;
        scaleBackground();

        return img;
    }

    function scaleBackground() {
        if (!canvas.backgroundImage) return;

        let scale = Math.min(
            canvas.width / canvas.backgroundImage.width,
            canvas.height / canvas.backgroundImage.height,
        );

        scale = canvas.width / canvas.backgroundImage.width;

        setCanvasSize(undefined, canvas.backgroundImage.height * scale);

        canvas.backgroundImage.scaleX = scale;
        canvas.backgroundImage.scaleY = scale;

        canvas.backgroundImage.left = canvas.width / 2;
        canvas.backgroundImage.top = canvas.height / 2;

        canvas.requestRenderAll();
    }

    export function removeBackground() {
        canvas.backgroundImage = null;
        adjustCanvasSize();
        canvas.requestRenderAll();
    }

    function formatTimeHMS(timestamp: number) {
        return new Date(timestamp).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } 

    export function getMaxAnimationDuration(): number {
        return Math.max(0, ...[polys, splits].map(object => { 
            return Math.max(...object.map(canvasItem => { return canvasItem.animationSettings.duration }));
        }));
    }

    export function exportToPng() {        
        const originalBg = canvas.backgroundColor;
        const originalBgImg = canvas.backgroundImage;

        canvas.backgroundImage = null;
        canvas.backgroundColor = "";
    
        unselectAll();
  
        setTimeout(() => {
            const scale = 2;

            const dataURL = canvas.toDataURL({
                format: "png",
                multiplier: scale,
                enableRetinaScaling: true
            });

            if (dataURL) {
                const link = document.createElement("a");
                link.href = dataURL;
                link.download =
                    "strava-stories-" + formatTimeHMS(Date.now()) + ".png";
                link.click();
                URL.revokeObjectURL(dataURL);
            }

            canvas.backgroundColor = originalBg;

            if (originalBgImg) canvas.backgroundImage = originalBgImg;

            canvas.renderAll.bind(canvas);
            canvas.requestRenderAll();
        }, 400);
    }
    
    function getCanvasObjectsBounds(padding = 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        [texts, rects, polys, splits, svgs].forEach(objects => objects.forEach(obj => {  
            obj.setCoords();
            obj.dirty = true;
        }));

        canvas.requestRenderAll();

        [texts, rects, polys, splits, svgs].forEach(objects => objects.forEach(obj => {  
            obj.setCoords();
            const r = obj.getCoords();
            r.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });           
        }));

        return {
            left: minX - padding,
            top: minY - padding,
            width: (maxX - minX) + padding * 2,
            height: (maxY - minY) + padding * 2
        };
    }

    const isMobileBrowser = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent) ||
            navigator.maxTouchPoints > 1;

    export async function exportToWebM() { 
        const originalBg = canvas.backgroundColor;
        const originalBgImg = canvas.backgroundImage;

        canvas.backgroundImage = null;
        canvas.backgroundColor = "";
        unselectAll();        

        const bounds = getCanvasObjectsBounds(20);
        
        let back = new Rect({                
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height,
            originX: "left",
            originY: "top",
            fill: "#000",
            selectable: false,
            objectCaching: false
        });

        canvas.add(back);
        canvas.moveObjectTo(back, 0);        
        canvas.requestRenderAll();

        const blob = await exportCanvasToWebM(isMobileBrowser);  

        if (!isMobileBrowser) {
            // Desktop browsers can generate transparent webm
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'strava-stories-webm-' + formatTimeHMS(Date.now()) + '.webm';
            a.click();
            URL.revokeObjectURL(url);  
        }        
        
        canvas.remove(back);

        canvas.backgroundColor = originalBg;
        if (originalBgImg) canvas.backgroundImage = originalBgImg;

        canvas.renderAll.bind(canvas);
        canvas.requestRenderAll();

        let mp4Blob = await convertWebMToMp4(blob);        
        
        const url = URL.createObjectURL(new Blob([mp4Blob.buffer], { type: 'video/quicktime' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'strava-stories-mp4-' + formatTimeHMS(Date.now()) + '.mp4';
        a.click();
    }
    
    async function convertWebMToMp4(blob: any): Promise<FileData> {
        let ffmpeg = new FFmpeg();
     
        ffmpeg.on('log', ({ message }) => {
            console.log("FFmpeg Log:", message);
        });

        await ffmpeg.load().catch(err => {
            console.error("FFmpeg failed to load:", err);
        });

        await ffmpeg.writeFile('input.webm', await fetchFile(blob));

        await ffmpeg.exec([
            '-i', 'input.webm',
            '-vf', 'fps=30,format=yuv420p',
            '-c:v', 'libx264',
            '-crf', '14',
            '-profile:v', 'high',
            '-level', '4.2',
            '-preset', 'slow',
            '-movflags', '+faststart',
            '-pix_fmt', 'yuv420p',
            'output.mp4'
            ]);

        return await ffmpeg.readFile('output.mp4');
    }

    async function exportCanvasToWebM(isMobile: boolean): Promise<Blob | MediaSource> {
        let canvasScale = 2;
        let fps = 30;
        
        const src = canvas.getElement();
        const w = canvas.width;
        const h = canvas.height;
        canvas.setDimensions(
            { width: w + (w % 2), height: h + (h % 2) },            
        );

        const hi = document.createElement('canvas');
        hi.width = src.width * canvasScale;
        hi.height = src.height * canvasScale;

        const ctx = hi.getContext('2d', { alpha: !isMobile });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'source-over';
        if (isMobile)
            ctx.globalAlpha = 1;    

        ctx?.scale(canvasScale, canvasScale);
        
        const recorder = new MediaRecorder(hi.captureStream(fps), {
            mimeType,            
            videoBitsPerSecond: 10_000_0000
        });

        const chunks: any[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.start();

        let duration = getMaxAnimationDuration();
        const start = performance.now();
        
        splits.forEach(s => s.startAnimation());
        polys.forEach(s => s.startAnimation());        

        function renderLoop() {            
            ctx.clearRect(0, 0, hi.width, hi.height);
            ctx.drawImage(src, 0, 0);
            
            if (performance.now() - start < duration + 2000) 
                requestAnimationFrame(renderLoop);
            else 
                recorder.stop();
        }

        requestAnimationFrame(renderLoop);

        return new Promise(resolve => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                resolve(blob);
            };
        });
    }

    export async function copyCanvasToClipboard() {
        const dataURL = canvas.toDataURL();
        const blob = await (await fetch(dataURL)).blob();

        await navigator.clipboard.write([
            new ClipboardItem({
            'image/png': blob
            })
        ]);        
    }

    export function dump() {
        let theme: S2PTheme = new S2PTheme("default");

        texts.forEach((text) => {
            let text_meta: S2PThemeObject = 
                new S2PThemeObject({         
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
            });

            if (!text.label.includes("_value")) text_meta.value = text.text;

            theme.texts.push(text_meta);
        });

        polys.forEach((poly) => {
            theme.polys.push(
                new S2PThemeObject({
                label: poly.label,
                left: poly.left / canvas.width,
                top: poly.top / canvas.height,
                angle: poly.angle,
                stroke: [poly.getStrokeStop(0), poly.getStrokeStop(1)],
                strokeWidth: poly.strokeWidth,
                fill: [poly.getFillStop(0), poly.getFillStop(1)],
                scaleX: poly.scaleX,
                scaleY: poly.scaleY,
            })
        )
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
            theme.rects.push(
                new S2PThemeObject({
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
            })
        )});

        splits.forEach(split => {
            theme.splits.push(new S2PThemeObject({
                ...split.themeData,
                left: split.left / canvas.width,
                top: split.top / canvas.height,
                width: (split.width * split.scaleX) / canvas.width,
                height: (split.height * split.scaleY) / canvas.height,
                barHeight: (split.barHeight * split.scaleY) / canvas.height,
                barGap: (split.barGap * split.scaleY) / canvas.height,        
            }))
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
        if (canvas.backgroundImage) return;

        let lastPos = 0;
        [texts, polys, rects, svgs, splits].forEach((col) => {
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

        setCanvasSize(undefined, lastPos);
        setCheckeredBackground();
        canvas.renderAll();
    }

    export function resetSlidersToMedian() {
        let medPos = getMedianPosition();
        if (medPos) {
            rangeX.value = medPos?.x.toString();
            rangeY.value = medPos?.y.toString();

            rangeX.lastValue = rangeX.value;
            rangeY.lastValue = rangeY.value;
        }
    }

    function setCanvasSize(width?: number, height?: number) {
        canvas.setDimensions({
            width: width ?? canvas.width,
            height: height ?? canvas.height,
        });

        sliderHeight = canvas.height;

        rangeY.max = canvas.height.toString();
        rangeX.max = canvas.width.toString();

        resetSlidersToMedian();
    }

    function moveObjects(objects: FabricObject[], dx: number, dy: number) {
        objects.forEach((obj) => {        
            obj.left = (obj.left ?? 0) + dx;
            obj.top = (obj.top ?? 0) + dy;
            obj.setCoords();
        });

        canvas.requestRenderAll();
    }

    export function addFilledPolyFromVector(
        label: string,
        elevations: number[],
        poly: S2PThemeObject,
    ): Group | undefined {
        if (!elevations.length) return;

        let points = generateXYFromPoints(elevations, canvas.getWidth(), 30);

        let filledPoly = new S2PCanvasPoly(
            label,
            canvas.getWidth(),
            50 - canvasPadding,
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

        sendAllRectsToBack();

        return filledPoly;
    }

    export function addPolyFromLatLngs(
        label: string,
        trackPoints: LatLng[],
        poly: S2PThemeObject,
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

        sendAllRectsToBack();

        return polyline;
    }

    export function addSplitsCharts(split_data: SplitData[], splitTheme: S2PThemeObject): S2PSplits | undefined {
        if (split_data.length == 0) {            
            canvas.add(new IText(
                "No splits data available",
                {                    
                    width: 500,
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: "center",
                    fontFamily: "Noto sans",
                    fontSize: 16,
                    fill: "#fff",
                    selectable: false,
                }
            ));

            return undefined;
        }

        let splitChart = new S2PSplits(splitTheme);
        canvas.add(splitChart);
        splits.push(splitChart);

        splitChart.createSplitsChart(split_data);                    
        adjustCanvasSize();

        canvas.sendObjectToBack(splitChart);
        canvas.renderAll();

        return splitChart;
    }

    function sendAllRectsToBack() {
        rects.forEach((r) => canvas.sendObjectBackwards(r));
    }

    function getMedianPosition(): { x: number; y: number } | null {
        let median = (numbers: number[]): number => {
            const sorted = [...numbers].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);

            return sorted.length % 2 === 0
                ? (sorted[mid - 1] + sorted[mid]) / 2
                : sorted[mid];
        }

        const objects = canvas.getObjects();

        if (objects.length === 0) return null;

        const xs = objects.map((obj) => obj.getCenterPoint().x);
        const ys = objects.map((obj) => obj.getCenterPoint().y);

        return {
            x: median(xs),
            y: median(ys),
        };
    }
</script>

<div
    bind:this={container}
    class="mb-1 canvas-wrapper"
    style="display: flex; flex-direction: column; align-items: center; justify-content: center;"
>
    <canvas bind:this={canvasEl}></canvas>
    <input
        type="range"
        min="0"
        bind:this={rangeY}
        class="form-range vertical-slider"
        style="touch-action: none; width: {sliderHeight}px;"
        oninput={(event: any) => {
            if (!event || !event.target) return;
            const value = Number(event.target.value);

            moveObjects(selected.length == 0 ? canvas.getObjects() : selected, 0, value - rangeY.lastValue);                        
            rangeY.lastValue = value;

            unselectAll();
        }}
        onchange={(event) => {
            rangeY.lastValue = Number(event.target.value);

            canvas.setActiveObject(selected[0]);
            canvas.requestRenderAll();
        }}
    />
    <input
        type="range"
        min="0"
        bind:this={rangeX}
        class="form-range horizontal-slider mb-2"
        style="touch-action: none; "
        oninput={(event) => {
          if (!event || !event.target) return;
            const value = Number(event.target.value);

            moveObjects(selected.length == 0 ? canvas.getObjects() : selected, value - rangeX.lastValue, 0);                        

            if (selected.length > 0) {
                selected.forEach(obj => {
                    obj.set('hasControls', false);
                    obj.set('hasBorders', false);
                });  
            }
            
            rangeX.lastValue = value;            
        }}
        onchange={(event) => {
            rangeX.lastValue = Number(event.target.value);

            canvas.setActiveObject(selected[0]);
            selected.forEach(obj => {
                obj.set('hasControls', true);
                obj.set('hasBorders', true);
            });    

            canvas.requestRenderAll();
        }}
    />

    <button
        class="btn btn-sm btn-primary mb-1"
        id="resizer"
        bind:this={resizer}
        style="text-align: center;">
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

    .canvas-wrapper {
        position: relative;
        display: inline-block;
    }

    .horizontal-slider {
        z-index: 10;

        margin-top: -12px;
    }

    .vertical-slider {
        position: absolute;
        z-index: 10;

        transform-origin: top left;
        transform: rotate(90deg) translateY(-100%);

        top: 0;        
        left: -10px;
    }

    /* Chrome, Safari, Edge */
    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none; /* remove default style */
        appearance: none;
        width: 24px; /* thumb width */
        height: 12px; /* thumb height */
        background: #007bff;
        border: none;
        border-radius: 2px; /* small rounding or 0 for perfect rectangle */
        cursor: pointer;
        margin-top: -3px; /* align with track */
    }

    /* Firefox */
    input[type="range"]::-moz-range-thumb {
        width: 24px;
        height: 12px;
        background: #007bff;
        border: none;
        border-radius: 2px;
        cursor: pointer;
    }

    /* Optional: style track */
    input[type="range"]::-webkit-slider-runnable-track {
        height: 6px;
        background: #dee2e6;
        border-radius: 3px;
    }

    input[type="range"]::-moz-range-track {
        height: 6px;
        background: #dee2e6;
        border-radius: 3px;
    }
</style>
