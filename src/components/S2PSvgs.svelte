<script lang="ts">
    import { loadSVGFromURL } from "fabric";
    import { S2PThemeSvg } from "../lib/S2PTheme";
    import { S2PSvg } from "../lib/S2PSvg";

    let {
        onRequestRedraw,
        onRequestAdd,
    }: {
        onRequestRedraw?: () => void;
        onRequestAdd?: (svgObj: S2PSvg) => void;
    } = $props();

    let svgUrls: string[] = [
        "/svgs/run-sport.svg",        
        "/svgs/road-cycling.svg",
        "/svgs/hike.svg",
        "/svgs/swim.svg",
        //"/svgs/strava.svg",
        "/svgs/zwift.svg",
        //"/svgs/strava_bo.svg",
        //"/svgs/strava_logo.svg"
    ];

    export async function loadSvg(url: string, themeSvgProps?: S2PThemeSvg) {
        loadSVGFromURL(url).then(({ objects, options }) => {
            if (!objects) return;

            let svg = new S2PSvg(objects, options, themeSvgProps);
            svg.url = url;
            onRequestAdd?.(svg);
            onRequestRedraw?.();
        });
    }
</script>

<ul class="svg-list">
    {#each svgUrls as url}
        <li>
            <img src={url} alt="SVG preview" />
            <button
                type="button"
                class="btn btn-sm btn-outline-primary d-flex align-items-center"
                style="width: 90%; height: 20px; justify-content: center; margin: 2px;"
                onclick={(e) => {
                    loadSvg(url, {
                        ...new S2PThemeSvg(),
                        top: 100,
                        left: 100,
                        width: 60,
                        height: 60,
                    });
                }}
            >
                <i class="bi bi-plus"></i>
            </button>
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
        gap: 3px;
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
        padding: 4px;
        background: white;
    }

    canvas {
        border: 1px solid #aaa;
        margin-top: 20px;
    }
</style>
