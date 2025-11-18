<script lang="ts">
    import { loadSVGFromURL, Group, FabricObject, util } from "fabric";
    import { S2PCanvasItemType } from "../lib/S2PCanvasItem";
    import type { S2PThemeSvg } from "../lib/S2PTheme";
    import { onMount } from "svelte";
    import { writable } from "svelte/store";

    let {
        onRequestRedraw,
        onRequestAdd,
        onRequestRemove,
    }: {
        onRequestRedraw?: () => void;
        onRequestAdd?: (svgObj: FabricObject) => void;
        onRequestRemove?: (svgObj: FabricObject) => void;
    } = $props();

    // Replace with your own SVG URLs
    let svgUrls: string[] = [
        "/svgs/run-sport.svg",
        "/svgs/ride.svg",
        "/svgs/hike.svg",
        "/svgs/swim.svg",
        "/svgs/strava.svg",
    ];

    // State: track which SVGs are checked
    let selected = writable<Record<string, boolean>>({});

    // Map to store loaded Fabric objects
    const fabricObjects: Record<string, FabricObject | Group> = {};

    onMount(() => {
        unselectAll();
    });

    function requestRedraw() {
        onRequestRedraw?.();
    }

    export function unselectAll() {
        svgUrls.forEach((svgUrl) =>
            selected.update((map) => ({ ...map, [svgUrl]: false })),
        );
    }

    export async function toggleSVG(
        url: string,
        checked: boolean,
        themeSvgProps?: S2PThemeSvg,
    ) {
        if (checked) {
            // Load and add to canvas
            loadSVGFromURL(url).then(({ objects, options }) => {
                if (!objects) return;

                const targetWidth = 60;
                const targetHeight = 60;

                objects.forEach((obj) => {
                    if (!obj) return;
                    if (
                        obj.fill == "rgb(0,0,0)" ||
                        obj.stroke == "#000000" ||
                        obj.fill == "#000000"
                    ) {
                        obj.stroke = "#fff";
                        obj.fill = "#fff";
                    }
                });
                var svgGroup = util.groupSVGElements(objects, options);

                // Calculate scale factors for width and height
                const scaleX = targetWidth / svgGroup.width;
                const scaleY = targetHeight / svgGroup.height;

                // Choose the smaller scale to maintain aspect ratio (no stretching)
                const scale = Math.min(scaleX, scaleY);

                svgGroup.scaleX = themeSvgProps?.scaleX ?? scale;
                svgGroup.scaleY = themeSvgProps?.scaleY ?? scale;

                const left = themeSvgProps ? themeSvgProps.left : 0;
                const top = themeSvgProps ? themeSvgProps.top : 0;

                // Optionally center the group within the target box
                // Calculate leftover space to center
                const leftoverX =
                    left + (targetWidth - svgGroup.width * scale) / 2;
                const leftoverY =
                    top + (targetHeight - svgGroup.height * scale) / 2;

                svgGroup.left = leftoverX;
                svgGroup.top = leftoverY;
                svgGroup.angle = themeSvgProps ? themeSvgProps.angle : 0;
                //@ts-ignore
                svgGroup.url = url;
                svgGroup.s2pType = S2PCanvasItemType.Svg;

                svgGroup.setCoords(); // update bounding box after scaling/position

                fabricObjects[url] = svgGroup;

                selected.update((map) => ({ ...map, [url]: checked }));

                onRequestAdd?.(svgGroup);
                requestRedraw();
            });
        } else {
            const objects = fabricObjects[url];
            if (objects) {
                onRequestRemove?.(objects);
                delete fabricObjects[url];
                requestRedraw();
            }
        }
    }
</script>

<ul class="svg-list">
    {#each svgUrls as url}
        <li>
            <img src={url} alt="SVG preview" />
            <label>
                <input
                    type="checkbox"
                    checked={$selected[url]}
                    on:change={(e) => {
                        toggleSVG(url, e.currentTarget.checked);
                    }}
                />
            </label>
        </li>
    {/each}
</ul>

<style>
    ul.svg-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    ul.svg-list li {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    ul.svg-list svg,
    ul.svg-list img {
        width: 60px;
        height: 60px;
        display: block;
        border: 1px solid #ccc;
        padding: 4px;
        background: white;
    }

    canvas {
        border: 1px solid #aaa;
        margin-top: 20px;
    }
</style>
