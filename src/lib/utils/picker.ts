import type { TFiller } from "fabric";

export function createPicker(pickerEl: HTMLDivElement, defaultColor: string | TFiller | null, onChangeCbk) {
    const pickr = Pickr.create({
        el: pickerEl,
        theme: "classic",
        default: defaultColor,
        swatches: [
            "#F44336",
            "#E91E63",
            "#9C27B0",
            "#673AB7",
            "#3F51B5",
            "#2196F3",
            "#03A9F4",
            "#00BCD4",
            "#009688",
            "#4CAF50",
            "#8BC34A",
            "#CDDC39",
            "#FFEB3B",
            "#FFC107",
        ],
        components: {
            preview: true,
            opacity: true,
            hue: true,
            interaction: {
                input: true,
            },
        },
    });

    pickr.on("change", (color, instance, pickerInst) => {
        const hex = color.toHEXA().toString();
        const swatch = pickerInst.getRoot().button;

        if (swatch) {
            swatch.style.setProperty("--pcr-color", hex);
        }

        onChangeCbk(color);
    });
 
    // Reposition panel when it's shown
    pickr.on("show", (instance, pickerInst) => {
        const swatch = pickerInst.getRoot().button;
        const panel = pickerInst.getRoot().app;

        if (swatch && panel) {
            const rect = swatch.getBoundingClientRect();

            // Position to the right of the swatch
            panel.style.position = "absolute";
            panel.style.left = `${rect.left + 40}px`; // 10px padding
            panel.style.top = `${rect.top}px`;
        }
    });

    return pickr;
}