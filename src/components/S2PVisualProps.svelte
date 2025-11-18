<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { createPicker } from "../lib/utils/picker";
    import type { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
    import { S2PCanvasText } from "../lib/S2PCanvasText";
    import type { FabricObject } from "fabric";
    import S2PRangeControl from "./S2PRangeControl.svelte";

    let {
        onRequestRedraw,
        hasFill,
        hasStroke,
        hasStrokeWidth,
        hasRadius,
        canvasItemSelected,
    }: {
        onRequestRedraw?: () => void;
        hasFill: boolean;
        hasStroke: boolean;
        hasStrokeWidth: boolean;
        hasRadius: boolean;
        canvasItemSelected: S2PCanvasPoly | S2PCanvasText | FabricObject;
    } = $props();

    let rndId = `${Math.random().toString(36).slice(2, 9)}`;

    let trackColorPicker: any = null;
    let trackColorPickerEl: HTMLDivElement;

    let trackFillPicker: any = null;
    let trackFillPickerEl: HTMLDivElement;

    let selectFontFamily: HTMLSelectElement;
    let fontFamilies = ["Kanit", "Verdana", "Arial", "Roboto", "Lobster", "Lato"];

    onMount(() => {
        trackColorPicker = createPicker(
            trackColorPickerEl,
            canvasItemSelected.stroke,
            (color: any) => {
                canvasItemSelected.set("stroke", color.toHEXA().toString());
                onRequestRedraw?.();
            },
        );

        trackFillPicker = createPicker(
            trackFillPickerEl,
            canvasItemSelected.fill,
            (color: any) => {
                canvasItemSelected.set("fill", color.toHEXA().toString());
                onRequestRedraw?.();
            },
        );

        fontFamilies.forEach((font) => {
            const option = document.createElement("option");
            option.value = font;
            option.textContent = font;
            option.style.fontFamily = font; // 💡 apply font directly
            selectFontFamily.appendChild(option);
        });
    });

    onDestroy(() => {
        trackColorPicker?.destroyAndRemove?.();
        trackFillPicker?.destroyAndRemove?.();
    });

    //@ts-ignore
    function trackStrokeChanged(newValue) {
        canvasItemSelected.set("strokeWidth", parseInt(newValue));

        onRequestRedraw?.();
    }

    //@ts-ignore
    function radiusChanged(newValue) {
        canvasItemSelected.set("rx", parseInt(newValue));
        canvasItemSelected.set("ry", parseInt(newValue));

        onRequestRedraw?.();
    }

    function fireTextChanged(e: any) {
        canvasItemSelected.set("text", e.target.value);
        onRequestRedraw?.();
    }

    function fireFontFamilyChanged(event: Event) {
        canvasItemSelected.set(
            "fontFamily",
            (event.target as HTMLSelectElement).value,
        );
        onRequestRedraw?.();
    }

    export function onChanged() {
        trackColorPicker?.setColor(canvasItemSelected.get("stroke"));
        trackFillPicker?.setColor(canvasItemSelected.get("fill"));
    }
</script>

<div
    class="container"
    style="display: {hasFill || hasStroke || hasStrokeWidth || hasRadius
        ? 'flex'
        : 'none'}"
>
    <div class="column" style="align-items: flex-end;">
        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText
                ? 'flex'
                : 'none'}"
        >
            <input
                value={canvasItemSelected.text}
                oninput={fireTextChanged}
                class="form-control"
            />
        </div>
        <div
            id={`trackFillWrapper_${rndId}`}
            style="display: flex; visibility: {hasFill ? 'visible' : 'hidden'}"
        >
            <label class="font-emp me-1">Fill</label>
            <div bind:this={trackFillPickerEl}></div>
        </div>

        <span
            style="display: {hasStrokeWidth
                ? 'flex'
                : 'none'}; white-space: nowrap;"
            class="font-emp">Border width</span
        >
        <span
            style="display: {hasRadius ? 'flex' : 'none'};white-space: nowrap;"
            class="me-1 font-emp">Radius</span
        >
    </div>
    <div class="column">
        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText
                ? 'flex'
                : 'none'}"
        >
            <select
                class="form-select"
                bind:this={selectFontFamily}
                value={canvasItemSelected.fontFamily}
                onchange={fireFontFamilyChanged}
            >           
            </select>
        </div>
        <div
            id={`trackColorWrapper_${rndId}`}
            style="display: flex; visibility: {hasStroke
                ? 'flex'
                : 'hidden'}; flex-direction: row;"
        >
            <div bind:this={trackColorPickerEl}></div>
            <label class="font-emp ms-1">Contour</label>
        </div>
        <div style="display: {hasStrokeWidth ? 'flex' : 'none'};">
            <S2PRangeControl
                onValueChanged={trackStrokeChanged}
                value={canvasItemSelected.strokeWidth}
                min={0}
                max={20}
                step={0.5}
            />
        </div>
        <div style="display: {hasRadius ? 'flex' : 'none'};">
            <S2PRangeControl
                onValueChanged={radiusChanged}
                value={canvasItemSelected.rx}
                min={0}
                max={canvasItemSelected.width}
                step={5}
            />
        </div>
    </div>
</div>

<style>
    .container {
        display: flex;
        justify-content: center;
    }

    .column {
        display: flex;
        width: 50%;
        flex-direction: column;
        justify-content: space-between;
    }

    .column > div,
    .column > label,
    .column > span {
        flex: 1; /* makes each item equal height */
        display: flex;
        align-items: center;
        padding: 0.25rem;
    }
</style>
