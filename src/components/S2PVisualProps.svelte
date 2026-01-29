<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { ColorCombos, createPicker } from "../lib/utils/picker";
    import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
    import { S2PCanvasText } from "../lib/S2PCanvasText";
    import S2PRangeControl from "./S2PRangeControl.svelte";
    import { Fonts } from "../lib/utils/fonts";
    import { S2PRect } from "../lib/S2PRect";
    import type { S2PSvg } from "../lib/S2PSvg";
    import type { FabricObject } from "fabric";
    import {
        S2PCanvasItemType,
        type S2PCanvasObjectType,
    } from "../lib/S2PCanvasItem";
    import { FieldMappings, FieldName } from "../lib/utils/fieldmappings";
    import { S2PSplits } from "../lib/S2PSplits";

    let {
        onRequestRedraw,
        onFieldMappingChanged,
        hasFill,
        hasStroke,
        hasStrokeWidth,
        hasRadius,
        currentSelection,
        canvasItemSelected,
    }: {
        onRequestRedraw?: () => void;
        onFieldMappingChanged: (canvasText: S2PCanvasText) => void;
        hasFill: boolean;
        hasStroke: boolean;
        hasStrokeWidth: boolean;
        hasRadius: boolean;
        currentSelection: FabricObject[];
        canvasItemSelected: S2PCanvasPoly | S2PCanvasText | S2PSvg | S2PRect;
    } = $props();

    let strokeColor1Picker: any = null;
    let strokeColor1PickerEl: HTMLDivElement;

    let strokeColor2Picker: any = null;
    let strokeColor2PickerEl: HTMLDivElement;

    let fill1Picker: any = null;
    let fill1PickerEl: HTMLDivElement;

    let fill2Picker: any = null;
    let fill2PickerEl: HTMLDivElement;

    let gradientStroke = $state(true);
    let gradientFill = $state(true);

    let selectFontFamily: HTMLSelectElement;
    let selectFieldMapping: HTMLSelectElement;

    let inputTextField: HTMLInputElement;

    const Fill: number = 0;
    const Stroke: number = 1;

    let isValueField = $derived(canvasItemSelected.label.endsWith("_value"));
    let isUnitField = $derived(
        canvasItemSelected.label.endsWith("_value_unit"),
    );

    onMount(() => {
        canvasItemSelected.fillColorComboIdx = 0;
        canvasItemSelected.strokeColorComboIdx = 0;

        let setColorToSelectedItems = (
            color: string,
            index: number,
            type: number,
        ) => {
            currentSelection.forEach((obj) => {
                if ("s2pType" in obj) {
                    let s2pObject = obj as S2PCanvasObjectType;
                    s2pObject.fillColorComboIdx =
                        canvasItemSelected.fillColorComboIdx;
                    s2pObject.strokeColorComboIdx =
                        canvasItemSelected.strokeColorComboIdx;

                    if (type == Fill) {
                        s2pObject.setFillStop(index, color);
                    } else {
                        s2pObject.setStrokeStop(index, color);
                    }
                }
            });
        };

        strokeColor1Picker = createPicker(
            strokeColor1PickerEl,
            canvasItemSelected.getStrokeStop(0),
            (color: any) => {
                if (
                    canvasItemSelected.getStrokeStop(1) == null ||
                    !gradientStroke
                ) {
                    strokeColor2Picker.setColor(color.toHEXA().toString());
                }
                canvasItemSelected.setStrokeStop(0, color.toHEXA().toString());
                setColorToSelectedItems(color.toHEXA().toString(), 0, Stroke);

                onRequestRedraw?.();
            },
        );

        strokeColor2Picker = createPicker(
            strokeColor2PickerEl,
            canvasItemSelected.getStrokeStop(1),
            (color: any) => {
                if (
                    canvasItemSelected.getStrokeStop(0) == null ||
                    !gradientStroke
                ) {
                    strokeColor1Picker.setColor(color.toHEXA().toString());
                }
                canvasItemSelected.setStrokeStop(1, color.toHEXA().toString());
                setColorToSelectedItems(color.toHEXA().toString(), 1, Stroke);

                onRequestRedraw?.();
            },
        );

        fill1Picker = createPicker(
            fill1PickerEl,
            canvasItemSelected.getFillStop(0),
            (color: any) => {
                if (
                    canvasItemSelected.getFillStop(1) == null ||
                    !gradientFill
                ) {
                    fill2Picker.setColor(color.toHEXA().toString());
                }
                canvasItemSelected.setFillStop(0, color.toHEXA().toString());
                setColorToSelectedItems(color.toHEXA().toString(), 0, Fill);
                onRequestRedraw?.();
            },
        );

        fill2Picker = createPicker(
            fill2PickerEl,
            canvasItemSelected.getFillStop(1),
            (color: any) => {
                if (
                    canvasItemSelected.getFillStop(0) == null ||
                    !gradientFill
                ) {
                    fill1Picker.setColor(color.toHEXA().toString());
                }
                canvasItemSelected.setFillStop(1, color.toHEXA().toString());
                setColorToSelectedItems(color.toHEXA().toString(), 1, Fill);
                onRequestRedraw?.();
            },
        );

        Object.values(Fonts.fontFamilies)
            .flat()
            .forEach((font) => {
                const option = document.createElement("option");
                option.value = font;
                option.textContent = font;
                option.style.fontFamily = font;
                selectFontFamily.appendChild(option);
            });

        let mappedFields = [
            FieldName.Name,
            FieldName.MovingTime,
            FieldName.Distance,
            FieldName.Elevation,
            FieldName.Calories,
            FieldName.AvgHeartRate,
            FieldName.MaxHeartRate,

            FieldName.AltitudeMax,
            FieldName.AltitudeMin,

            FieldName.AvgPower,
            FieldName.MaxPower,

            FieldName.Text,
        ];

        Object.values(mappedFields).forEach((field) => {
            const option = document.createElement("option");
            option.value = field;
            option.textContent = field;
            selectFieldMapping.appendChild(option);
        });
    });

    onDestroy(() => {
        strokeColor1Picker?.destroyAndRemove?.();
        fill1Picker?.destroyAndRemove?.();
    });

    //@ts-ignore
    function trackStrokeChanged(newValue) {
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj) {
                let s2pObject = obj as FabricObject;
                s2pObject.set("strokeWidth", parseInt(newValue));
            }
        });

        canvasItemSelected.set("strokeWidth", parseInt(newValue));
        onRequestRedraw?.();
    }

    function barWidthChanged(newValue: number) {
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj && obj.s2pType == S2PCanvasItemType.Splits) {
                let s2pObject = obj as S2PSplits;
                s2pObject.barWidth = newValue;
            }
        });

        onRequestRedraw?.();
    }

    function barGapChanged(newValue: number) {
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj && obj.s2pType == S2PCanvasItemType.Splits) {
                let s2pObject = obj as S2PSplits;
                s2pObject.barGap = newValue;
            }
        });

        onRequestRedraw?.();
    }

    function fontWeightChanged(newValue: number) {
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj && obj.s2pType == S2PCanvasItemType.Text) {
                let s2pObject = obj as S2PCanvasText;
                s2pObject.set("fontWeight", newValue);
            }
        });

        onRequestRedraw?.();
    }

    function charSpacingChanged(newValue: number) {
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj && obj.s2pType == S2PCanvasItemType.Text) {
                let s2pObject = obj as S2PCanvasText;
                s2pObject.set("charSpacing", newValue);
            }
        });

        onRequestRedraw?.();
    }

    //@ts-ignore
    function radiusChanged(newValue) {
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj)
                if (obj.s2pType == S2PCanvasItemType.Rect) {
                    let s2pObject = obj as S2PRect;
                    s2pObject.set("rx", parseInt(newValue));
                    s2pObject.set("ry", parseInt(newValue));
                }
        });

        canvasItemSelected.set("rx", parseInt(newValue));
        canvasItemSelected.set("ry", parseInt(newValue));

        onRequestRedraw?.();
    }

    function fireTextChanged(e: any) {
        canvasItemSelected.set("text", e.target.value);
        onRequestRedraw?.();
    }

    function fireFieldMappingChanged(e: any) {
        let fieldId = FieldMappings.fieldNameToId(e.target.value);

        if (fieldId) {
            (canvasItemSelected as S2PCanvasText).label = fieldId;
            onFieldMappingChanged(canvasItemSelected as S2PCanvasText);
        }
    }

    function updateFieldLabel(add: boolean, suffix: string) {
        let oldLabelStripped = (canvasItemSelected as S2PCanvasText).label
            .replace("_value_unit", "")
            .replace("_value", "");

        (canvasItemSelected as S2PCanvasText).label = oldLabelStripped;

        if (add) {
            (canvasItemSelected as S2PCanvasText).label += suffix;
        }

        onFieldMappingChanged(canvasItemSelected as S2PCanvasText);
    }

    function onFieldValueTypeChanged(e: any) {
        updateFieldLabel(e.target.checked, "_value");
        if (e.target.checked) isUnitField = false;
    }

    function onFieldUnitTypeChanged(e: any) {
        updateFieldLabel(e.target.checked, "_value_unit");
        if (e.target.checked) isValueField = false;
    }

    function fireFontFamilyChanged(event: Event) {
        currentSelection.forEach((obj) => {
            if (
                "s2pType" in obj &&
                (obj.s2pType == S2PCanvasItemType.Text ||
                    obj.s2pType == S2PCanvasItemType.Splits)
            ) {
                obj.set(
                    "fontFamily",
                    (event.target as HTMLSelectElement).value,
                );
            }
        });

        canvasItemSelected.set(
            "fontFamily",
            (event.target as HTMLSelectElement).value,
        );
        onRequestRedraw?.();
    }

    function fireFontStyleChanged() {
        let currFont = canvasItemSelected.get("fontStyle");
        currentSelection.forEach((obj) => {
            if ("s2pType" in obj && obj.s2pType == S2PCanvasItemType.Text) {
                obj.set(
                    "fontStyle",
                    !currFont || currFont == "normal" ? "italic" : "normal",
                );

                if (obj.s2pType == S2PCanvasItemType.Splits)
                    (obj as S2PSplits).fontStyle =
                        !currFont || currFont == "normal" ? "italic" : "normal";
            }
        });

        canvasItemSelected.set(
            "fontStyle",
            !currFont || currFont == "normal" ? "italic" : "normal",
        );

        onRequestRedraw?.();
    }

    function onFillTypeChanged(event: any) {
        // true => gradient
        canvasItemSelected.fillColorComboIdx = Math.floor(
            canvasItemSelected.fillColorComboIdx,
        );

        gradientFill = event.target.checked;
        setPickersToCurrColor(Fill, gradientFill);
    }

    function onStrokeTypeChanged(event: any) {
        // true => gradient
        canvasItemSelected.strokeColorComboIdx = Math.floor(
            canvasItemSelected.strokeColorComboIdx,
        );

        gradientStroke = event.target.checked;
        setPickersToCurrColor(Stroke, gradientStroke);
    }

    function getColorCombos(
        type: number,
        isGradient: boolean,
    ): [string, string] {
        let index =
            type == Fill
                ? canvasItemSelected.fillColorComboIdx
                : canvasItemSelected.strokeColorComboIdx;

        let colorCombo = ColorCombos.colorCombos[Math.floor(index)];

        let isMiddle = Math.abs((index % 1) - 0.5) < Number.EPSILON;

        let fCIdx = 0,
            sCIdx = 1;
        if (!isGradient) {
            if (isMiddle) {
                fCIdx = 1;
                sCIdx = 1;
            } else {
                fCIdx = 0;
                sCIdx = 0;
            }
        }

        return [colorCombo[fCIdx], colorCombo[sCIdx]];
    }

    function setPickersToCurrColor(type: number, isGradient: boolean) {
        let colorCombos = getColorCombos(type, isGradient);

        if (type == Fill) {
            canvasItemSelected.setFillStop(0, colorCombos[0]);
            canvasItemSelected.setFillStop(1, colorCombos[1]);

            fill1Picker?.setColor(canvasItemSelected.getFillStop(0));
            fill2Picker?.setColor(canvasItemSelected.getFillStop(1));
        } else {
            canvasItemSelected.setStrokeStop(0, colorCombos[0]);
            canvasItemSelected.setStrokeStop(1, colorCombos[1]);

            strokeColor1Picker?.setColor(canvasItemSelected.getStrokeStop(0));
            strokeColor2Picker?.setColor(canvasItemSelected.getStrokeStop(1));
        }
    }

    function colorFill(direction: boolean) {
        let incr = gradientFill ? 1 : 0.5;

        if (direction) {
            canvasItemSelected.fillColorComboIdx =
                ((canvasItemSelected.fillColorComboIdx ?? 0) + incr) %
                ColorCombos.colorCombos.length;
        } else {
            canvasItemSelected.fillColorComboIdx =
                ((canvasItemSelected.fillColorComboIdx ?? 0) -
                    incr +
                    ColorCombos.colorCombos.length) %
                ColorCombos.colorCombos.length;
        }

        setPickersToCurrColor(Fill, gradientFill);
        onRequestRedraw?.();
    }

    function colorStroke(direction: boolean) {
        let incr = gradientStroke ? 1 : 0.5;

        if (direction) {
            canvasItemSelected.strokeColorComboIdx =
                ((canvasItemSelected.strokeColorComboIdx ?? -1) + incr) %
                ColorCombos.colorCombos.length;
        } else {
            canvasItemSelected.strokeColorComboIdx =
                ((canvasItemSelected.strokeColorComboIdx ?? -1) -
                    incr +
                    ColorCombos.colorCombos.length) %
                ColorCombos.colorCombos.length;
        }

        setPickersToCurrColor(Stroke, gradientStroke);
        onRequestRedraw?.();
    }

    export function onChanged() {
        let isColorDifferent = (
            index: number,
            type: number,
            colorPicker: any,
        ) => {
            if (type == Fill)
                return (
                    canvasItemSelected.getFillStop(index) !=
                    colorPicker.getColor().toHEXA().toString()
                );
            else
                return (
                    canvasItemSelected.getStrokeStop(index) !=
                    colorPicker.getColor().toHEXA().toString()
                );
        };

        if (canvasItemSelected && currentSelection.length == 1)
            if (
                canvasItemSelected instanceof S2PCanvasText ||
                canvasItemSelected instanceof S2PCanvasPoly ||
                canvasItemSelected instanceof S2PSplits ||
                canvasItemSelected instanceof S2PRect
            ) {
                if (canvasItemSelected instanceof S2PCanvasText) {
                    if (inputTextField)
                        inputTextField.value = canvasItemSelected.text;

                    selectFieldMapping.value = FieldMappings.fieldIdToName(
                        canvasItemSelected.label
                            .replace("_value_unit", "")
                            .replace("_value", ""),
                    );
                }

                if (isColorDifferent(0, Stroke, strokeColor1Picker))
                    strokeColor1Picker?.setColor(
                        canvasItemSelected.getStrokeStop(0),
                    );

                if (isColorDifferent(1, Stroke, strokeColor2Picker))
                    strokeColor2Picker?.setColor(
                        canvasItemSelected.getStrokeStop(1),
                    );

                if (isColorDifferent(0, Fill, fill1Picker))
                    fill1Picker?.setColor(canvasItemSelected.getFillStop(0));
                if (isColorDifferent(1, Fill, fill2Picker))
                    fill2Picker?.setColor(canvasItemSelected.getFillStop(1));
            } else {
                strokeColor1Picker?.setColor(canvasItemSelected.get("stroke"));
                fill1Picker?.setColor(canvasItemSelected.get("fill"));
            }
    }
</script>

<div
    class="container"
    style="display: {hasFill || hasStroke || hasStrokeWidth || hasRadius
        ? 'flex'
        : 'none'}"
>
    <div
        class="column gap-2"
        style="align-items: flex-end; padding-right: 0.25rem;"
    >
        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            canvasItemSelected instanceof S2PSplits ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'}; width: 100%; flex-direction: column;"
        >
            <input
                disabled={currentSelection.length > 1 ||
                    canvasItemSelected instanceof S2PSplits}
                bind:this={inputTextField}
                value={canvasItemSelected.text}
                oninput={fireTextChanged}
                class="form-control mb-2"
            />
        </div>
        <div
            style="display: flex; visibility: {hasFill
                ? 'flex'
                : 'hidden'}; flex-direction: column; width: 100%;"
        >
            <label
                class="font-emp ms-1"
                style="align-self: self-end;touch-action: none; pointer-events: none;"
                >Fill</label
            >

            <div class="d-flex gap-2">
                <label for="switchFillType">solid</label>
                <div class="form-check form-switch">
                    <input
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="switchFillType"
                        checked
                        oninput={onFillTypeChanged}
                    />
                    <label for="switchFillType">gradient</label>
                </div>
            </div>

            <div class="btn-group me-mobile" role="group" style="width: 100%;">
                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => colorFill(false)}
                >
                    <i class="bi bi-caret-left-fill"></i>
                </button>
                <button class="btn btn-outline-primary">
                    <div bind:this={fill1PickerEl}></div></button
                >
                <button class="btn btn-outline-primary">
                    <div bind:this={fill2PickerEl}></div></button
                >

                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => colorFill(true)}
                >
                    <i class="bi bi-caret-right-fill"></i>
                </button>
            </div>
        </div>

        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'}; width: 100%; flex-direction: column;"
        >
            <label
                class="font-emp ms-1"
                style="align-self: self-end;touch-action: none; pointer-events: none;"
                >Mapping</label
            >

            <select
                class="form-select"
                disabled={currentSelection.length > 1}
                bind:this={selectFieldMapping}
                onchange={fireFieldMappingChanged}
            >
            </select>
        </div>

        <span
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'}; white-space: nowrap;"
            class="font-emp">Font weight</span
        >

        <span
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'}; white-space: nowrap;"
            class="font-emp">Letter spacing</span
        >

        <span
            style="display: {canvasItemSelected instanceof S2PSplits
                ? 'flex'
                : 'none'}; white-space: nowrap;"
            class="font-emp">Bar width</span
        >

        <span
            style="display: {canvasItemSelected instanceof S2PSplits
                ? 'flex'
                : 'none'}; white-space: nowrap;"
            class="font-emp">Bar gap</span
        >

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
    <div class="column gap-2" style="padding-left: 0.25rem;">
        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            canvasItemSelected instanceof S2PSplits ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'}; width: 100%; flex-direction: column;"
        >
            <div class="d-flex mb-2" style="flex-direction: row; width: 100%;">
                <select
                    class="form-select"
                    bind:this={selectFontFamily}
                    value={canvasItemSelected.fontFamily}
                    onchange={fireFontFamilyChanged}
                >
                </select>
                <button
                    type="button"
                    class="btn ms-2 btn-outline-secondary {canvasItemSelected.fontStyle !=
                    'normal'
                        ? 'active'
                        : ''}"
                    data-bs-toggle="button"
                    onclick={fireFontStyleChanged}
                    aria-pressed={canvasItemSelected.fontStyle != "normal"}
                    ><i class="bi bi-type-italic"></i></button
                >
            </div>
        </div>

        <div
            style="display: flex; visibility: {hasStroke
                ? 'flex'
                : 'hidden'}; flex-direction: column; width: 100%;"
        >
            <label
                class="font-emp ms-1"
                style="align-self: self-start; touch-action: none; pointer-events: none;"
                >Edge</label
            >

            <div class="d-flex gap-2">
                <label for="switchStrokeCheckChecked">solid</label>
                <div class="form-check form-switch">
                    <input
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="switchStrokeCheckChecked"
                        checked
                        oninput={onStrokeTypeChanged}
                    />
                    <label for="switchStrokeCheckChecked">gradient</label>
                </div>
            </div>

            <div class="btn-group" role="group" style="width: 100%;">
                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => colorStroke(false)}
                >
                    <i class="bi bi-caret-left-fill"></i>
                </button>
                <button class="btn btn-outline-primary">
                    <div bind:this={strokeColor1PickerEl}></div></button
                >

                <button class="btn btn-outline-primary">
                    <div bind:this={strokeColor2PickerEl}></div></button
                >
                <button
                    class="btn btn-sm btn-outline-primary"
                    onclick={() => colorStroke(true)}
                >
                    <i class="bi bi-caret-right-fill"></i>
                </button>
            </div>
        </div>

        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'}; width: 100%; flex-direction: column;"
        >
            <label
                class="font-emp ms-1"
                style="align-self: self-start; touch-action: none; pointer-events: none;"
                >Type</label
            >

            <div
                class="d-flex ms-1"
                style="width:100%; flex-direction: row; align-self: start;"
            >
                <label class="me-2 mt-2" for="fieldValueType">value</label>
                <div class="form-check mt-2">
                    <input
                        id="fieldValueType"
                        disabled={currentSelection.length > 1}
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        bind:checked={isValueField}
                        oninput={onFieldValueTypeChanged}
                    />
                </div>

                <label class="me-2 mt-2" for="fieldUnitType">unit</label>
                <div class="form-check mt-2">
                    <input
                        id="fieldUnitType"
                        disabled={currentSelection.length > 1}
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        bind:checked={isUnitField}
                        onchange={onFieldUnitTypeChanged}
                    />
                </div>

                <select class="form-select" style="visibility: hidden;"
                ></select>
            </div>
        </div>

        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'};"
        >
            <S2PRangeControl
                onValueChanged={fontWeightChanged}
                value={canvasItemSelected.fontWeight}
                min={100}
                max={900}
                step={100}
            />
        </div>

        <div
            style="display: {canvasItemSelected instanceof S2PCanvasText ||
            currentSelection.length > 1
                ? 'flex'
                : 'none'};"
        >
            <S2PRangeControl
                onValueChanged={charSpacingChanged}
                value={canvasItemSelected.charSpacing ?? 0}
                min={0}
                max={600}
                step={25}
            />
        </div>

        <div
            style="display: {canvasItemSelected instanceof S2PSplits
                ? 'flex'
                : 'none'};"
        >
            <S2PRangeControl
                onValueChanged={barWidthChanged}
                value={canvasItemSelected.barWidth}
                min={0}
                max={100}
                step={0.5}
            />
        </div>

        <div
            style="display: {canvasItemSelected instanceof S2PSplits
                ? 'flex'
                : 'none'};"
        >
            <S2PRangeControl
                onValueChanged={barGapChanged}
                value={canvasItemSelected.barGap}
                min={0}
                max={200}
                step={1}
            />
        </div>

        <div style="display: {hasStrokeWidth ? 'flex' : 'none'};">
            <S2PRangeControl
                onValueChanged={trackStrokeChanged}
                value={canvasItemSelected.strokeWidth}
                min={0}
                max={20}
                step={1}
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
        padding: 0;
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
    }

    @media (max-width: 600px) {
        .me-mobile {
            margin-right: 1.25rem !important;
        }
    }
</style>
