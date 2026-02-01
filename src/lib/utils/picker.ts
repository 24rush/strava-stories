import type { TFiller } from "fabric";

export class ColorCombos {
    static colorCombos: [string, string][] = [        
        ["#E91E63", "#FC5200"],
        ["#0EA5E9", "#2563EB"],
        ["#ffcd23", "#ff2768"],        
        ["#dcbcd0", "#b175ff"],
        ["#FCFFDA", "#03A9F4"],
        
        ["#3EC3FF", "#FF3A75"],
        ["#FF236E", "#FF776D"],
        ["#3D97F133", "#731636"],
        
        ["#7C3AED", "#2563EB"],
        ["#22C55E", "#16A34A"],
        ["#F97316", "#EA580C"],
        ["#EC4899", "#DB2777"],
        ["#14B8A6", "#0D9488"],
        ["#6366F1", "#4F46E5"],
        ["#F43F5E", "#E11D48"],
        ["#A855F7", "#7E22CE"],
        ["#38BDF8", "#0284C7"],

        ["#FFF", "#FFF"],
        ["#FFFFFF00", "#FFFFFF00"]
    ];

    static swatches: string[] = [
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
    ]
}

export function createPicker(pickerEl: HTMLDivElement, defaultColor: string | TFiller | null, onChangeCbk) {
    const pickr = Pickr.create({
        el: pickerEl,
        theme: "classic",
        default: defaultColor,
        swatches: ColorCombos.swatches,
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

    // When Pickr is open, block Backspace from bubbling out
    pickr.on('show', () => {
        document.addEventListener('keydown', stopBackspace, true);
    });

    // When Pickr closes, remove the handler
    pickr.on('hide', () => {
        document.removeEventListener('keydown', stopBackspace, true);
    });

    function stopBackspace(e: any) {
        if (e.key === 'Backspace') {
            e.stopPropagation();
        }
    }

    return pickr;
}