<script lang="ts">
    import { ColorSuggestions } from "../lib/utils/palette";
    import S2PCanvas from "./S2PCanvas.svelte";
    import { onDestroy, onMount } from "svelte";
    import { createPicker } from "../lib/utils/picker";

    let {
        s2pCanvas,
        onSolidColorChanged,
        onGradientChanged,
        onSuggestedColorsChangedEvent,
        onBackgroundRemoved,
    }: {
        s2pCanvas: S2PCanvas;
        onSolidColorChanged: (color: any) => void;
        onGradientChanged: (type: number, color: any) => void;
        onSuggestedColorsChangedEvent?: (v: boolean) => void;
        onBackgroundRemoved?: () => void;
    } = $props();

    let backgroundImgAdded = $state(false);
    let bgInput: HTMLInputElement;

    let suggestedColorsGenerator = new ColorSuggestions();
    let suggestedColors: string[][] = $state(
        suggestedColorsGenerator.getDefaultColors(),
    );
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

        colorPicker = createPicker(colorPickerEl, "#fff", (color: any) => {
            onSolidColorChanged(color);
        });

        gradientStartPicker = createPicker(
            gradientStartPickerEl,
            "#fff",
            (color: any) => {
                onGradientChanged(Start, color);
            },
        );

        gradientEndPicker = createPicker(
            gradientEndPickerEl,
            "#fff",
            (color: any) => {
                onGradientChanged(End, color);
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

        gradientStartPicker.setColor(currentColor[1]);
        gradientEndPicker.setColor(currentColor[2]);
        colorPicker.setColor(currentColor[0]);
    }

    export function getCurrentColors(): string[] {
        return [
            colorPicker.getColor().toHEXA().toString(),
            gradientStartPicker.getColor().toHEXA().toString(),
            gradientEndPicker.getColor().toHEXA().toString(),
        ];
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
</script>

<div class="d-flex" style="flex-direction: column;">
    <button
        type="button"
        class="btn btn-sm btn-primary mb-2"
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

        <div style="flex-direction: column;list-style: none;">
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
