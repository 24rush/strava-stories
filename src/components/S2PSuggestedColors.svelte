<script lang="ts">
    import type { FabricImage } from "fabric";
    import { ColorSuggestions } from "../lib/utils/palette";
    import S2PCanvas from "./S2PCanvas.svelte";
    import { onDestroy, onMount } from "svelte";
    import { createPicker } from "../lib/utils/picker";

    let {
        s2pCanvas,
        onSuggestedColorsChangedEvent,
        onBackgroundRemoved,
        onRequestRedraw,
    }: {
        s2pCanvas: S2PCanvas;
        onSuggestedColorsChangedEvent?: (v: boolean) => void;
        onBackgroundRemoved?: () => void;
        onRequestRedraw?: () => void;
    } = $props();

    let backgroundImgAdded = $state(false);
    let bgInput: HTMLInputElement;

    let suggestedColorsGenerator = new ColorSuggestions();
    let suggestedColors: string[][] = $state(suggestedColorsGenerator.getDefaultColors());
    let showSuggestedColors = $state(true);
    let currColorIdx = 0;

    let colorPicker: any = null;
    let colorPickerEl: HTMLDivElement;
    let gradientStartPicker: any = null;
    let gradientStartPickerEl: HTMLDivElement;
    let gradientEndPicker: any = null;
    let gradientEndPickerEl: HTMLDivElement;

    onMount(() => {
        let Start = 0,
            End = 1;

        let isNullOfTransparent = (color: string | null): boolean => {
            return (
                !color ||
                color.toLowerCase() == "#ffffff" ||
                color.toLowerCase() == "#ffffff00"
            );
        };

        let setGradient = (type: number, color: any) => {
            let colorStr = color.toHEXA().toString();
            let moreAlphaColorStr = decreaseHexaOpacity(colorStr, 0.5);

            let gradientIndex = type == Start ? 0 : 1;

            let rects = s2pCanvas.getObjects().rects;
            rects.forEach((r) => {
                if (!isNullOfTransparent(r.getStrokeStop(gradientIndex)))
                    r.setStrokeStop(gradientIndex, colorStr);

                if (!isNullOfTransparent(r.getFillStop(gradientIndex)))
                    r.setFillStop(gradientIndex, moreAlphaColorStr);
            });

            let polys = s2pCanvas.getObjects().polys;
            polys.forEach((p) => {
                if (!isNullOfTransparent(p.getStrokeStop(gradientIndex)))
                    p.setStrokeStop(gradientIndex, colorStr);

                if (
                    !p.isPolyline &&
                    !isNullOfTransparent(p.getFillStop(gradientIndex))
                )
                    p.setFillStop(gradientIndex, moreAlphaColorStr);
            });
        };

        colorPicker = createPicker(colorPickerEl, "#fff", (color: any) => {
            let colorStr = color.toHEXA().toString();
            let moreAlphaColorStr = decreaseHexaOpacity(colorStr);

            let texts = s2pCanvas.getObjects().texts;

            texts.forEach((t) => {
                let isUnit = t.label.includes("_value_unit");

                t.setFillStop(0, isUnit ? moreAlphaColorStr : colorStr);
                t.setFillStop(1, isUnit ? moreAlphaColorStr : colorStr);
            });

            onRequestRedraw?.();
        });

        gradientStartPicker = createPicker(
            gradientStartPickerEl,
            "#fff",
            (color: any) => {
                setGradient(Start, color);
                onRequestRedraw?.();
            },
        );

        gradientEndPicker = createPicker(
            gradientEndPickerEl,
            "#fff",
            (color: any) => {
                setGradient(End, color);
                onRequestRedraw?.();
            },
        );
                
        setPickerColors();
    });

    onDestroy(() => {
        colorPicker?.destroyAndRemove?.();
        gradientStartPicker?.destroyAndRemove?.();
        gradientEndPicker?.destroyAndRemove?.();
    });

    async function onLoadBackground(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        let img = await s2pCanvas.loadBackground(URL.createObjectURL(file));

        backgroundImgAdded = img != null;

        if (backgroundImgAdded) {
            suggestedColors = suggestedColorsGenerator.generateColorsFromImage(
                img?._element,
            );

            showSuggestedColors = true;
            currColorIdx = 0;
            setPickerColors();
        }

        bgInput.value = "";
    }

    export function setPickerColors() {
        let currentColor = suggestedColors[currColorIdx];

        colorPicker.setColor(currentColor[0]);
        gradientStartPicker.setColor(currentColor[1]);
        gradientEndPicker.setColor(currentColor[2]);
    }

    function onSuggestedColorsChanged(event: any) {
        showSuggestedColors = event.target.checked;

        suggestedColors = showSuggestedColors
            ? suggestedColorsGenerator.getSuggestedColors()
            : suggestedColorsGenerator.getDefaultColors();

        currColorIdx = 0;
        setPickerColors();

        onSuggestedColorsChangedEvent?.(showSuggestedColors);
    }

    function nextSuggestedColor(direction: boolean) {
        if (suggestedColors.length == 0) return;

        if (direction) {
            currColorIdx = ((currColorIdx ?? -1) + 1) % suggestedColors.length;
        } else {
            currColorIdx =
                ((currColorIdx ?? -1) - 1 + suggestedColors.length) %
                suggestedColors.length;
        }

        setPickerColors();
    }

    function decreaseHexaOpacity(hexa: string, amount = 0.2) {
        // amount: how much to reduce (0–1)
        const hex = hexa.replace("#", "");

        const rgb = hex.slice(0, 6);
        let a = parseInt(hex.slice(6, 8) ?? "FF", 16) / 255;
        if (isNaN(a)) a = 1;

        const newAlpha = Math.max(0, Math.min(1, a - amount));
        const newAlphaHex = Math.round(newAlpha * 255)
            .toString(16)
            .padStart(2, "0");

        return `#${rgb}${newAlphaHex}`;
    }
</script>

<div class="d-flex" style="flex-direction: column;">
    <button
        type="button"
        class="btn btn-sm btn-primary"
        onclick={() => {
            if (backgroundImgAdded) {
                s2pCanvas.removeBackground();
                backgroundImgAdded = false;

                suggestedColors = suggestedColorsGenerator.getDefaultColors();
                currColorIdx = 0;
                setPickerColors();

                onBackgroundRemoved?.();
                return;
            }

            bgInput.click();
        }}
        ><span
            >{backgroundImgAdded ? "Remove background" : "Add background"}</span
        >
        <input
            bind:this={bgInput}
            onchange={onLoadBackground}
            type="file"
            id="file-input"
            accept="image/*"
            style="display: none;"
        />
    </button>
    <i class="mb-2">(it will not be exported in final image)</i>

    <div class="d-flex gap-2 mb-2" style="flex-direction: column;">
        <div
            style="margin: auto;display: {backgroundImgAdded
                ? 'flex'
                : 'none'};"
        >
            <label for="switchCheckChecked" class="me-2">theme colors</label>
            <div class="form-check form-switch">
                <input
                    class="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="switchCheckChecked"
                    bind:checked={showSuggestedColors}
                    oninput={onSuggestedColorsChanged}
                />
                <label for="switchCheckChecked">suggested</label>
            </div>
        </div>

        <div
            style="flex-direction: column;list-style: none;"
        >
            <div class="btn-group me-mobile" role="group" style="width: 100%;">
                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => nextSuggestedColor(false)}
                >
                    <i class="bi bi-caret-left-fill"></i>
                </button>
                <button class="btn btn-outline-primary">
                    <div bind:this={colorPickerEl}></div></button
                >
                <button class="btn btn-outline-primary">
                    <div bind:this={gradientStartPickerEl}></div></button
                >
                <button class="btn btn-outline-primary">
                    <div bind:this={gradientEndPickerEl}></div></button
                >

                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => nextSuggestedColor(true)}
                >
                    <i class="bi bi-caret-right-fill"></i>
                </button>
            </div>
        </div>
    </div>
</div>
