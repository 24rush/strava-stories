<script lang="ts">
  import { onMount, tick } from "svelte";
  import S2PCanvas from "./S2PCanvas.svelte";
  import S2PSvgs from "./S2PSvgs.svelte";
  import { S2PCanvasText } from "../lib/S2PCanvasText";
  import { Converters } from "../lib/utils/converters";
  import S2PVisualProps from "./S2PVisualProps.svelte";
  import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
  import { S2PTheme, S2PThemePoly, S2PThemeText } from "../lib/S2PTheme";
  import { S2PCanvasItemType } from "../lib/S2PCanvasItem";
  import type { FabricObject } from "fabric";

  export let data: any = {};
  export let themes: S2PTheme[] = [];

  let themeNames: string[] = [];
  let currentThemeIdx = 0;

  let bgInput: HTMLInputElement;
  let backgroundImgAdded = false;

  let s2pCanvas: S2PCanvas;
  let s2pSvgs: S2PSvgs;

  let canvasText: S2PCanvasText | undefined;
  let canvasPoly: S2PCanvasPoly | undefined;
  let canvasItemSelected:
    | S2PCanvasPoly
    | S2PCanvasText
    | FabricObject
    | undefined;

  let polyProp: S2PVisualProps;

  let hasFill: boolean;
  let hasStroke: boolean;
  let hasStrokeWidth: boolean;
  let hasRadius: boolean;

  let fontScaling: number = 1;

  onMount(() => {
    if (!themes || !themes.length) return;

    themes.forEach((t) => themeNames.push(t.name));
    themeNames = [...themeNames];

    updateObjectPositions(themes);
    reloadTheme();
  });

  export function reloadTheme() {
    if (themes && themes[currentThemeIdx]) {
      loadTheme(themes[currentThemeIdx] ?? new S2PTheme(""));
      onRequestRedraw();
    }
  }

  function updateObjectPositions(themes: S2PTheme[]) {
    let canvasWidth = s2pCanvas.getCanvas().width;

    themes.forEach((t) => {
      let canvasHeight = canvasWidth * t.height_percentage;

      if (t.polys)
        t.polys.forEach((poly: S2PThemePoly) => {
          poly.left *= canvasWidth;
          poly.top *= canvasHeight;
        });

      if (t.texts)
        t.texts.forEach((text) => {
          text.left *= canvasWidth;
          text.top *= canvasHeight;
          text.fontSize /= window.devicePixelRatio;
        });

      if (t.svgs)
        t.svgs.forEach((svgTheme) => {
          svgTheme.left = svgTheme.left * canvasWidth;
          svgTheme.top = svgTheme.top * canvasHeight;
        });
    });
  }

  function loadTheme(theme_meta: S2PTheme | undefined) {
    s2pCanvas.clear();
    s2pSvgs.unselectAll();

    if (!theme_meta) return;

    let canvasWidth = s2pCanvas.getCanvas().width;
    let canvasHeight = canvasWidth * theme_meta.height_percentage;

    s2pCanvas.getCanvas().setDimensions({
      height: canvasHeight,
    });

    if (theme_meta.polys && data && data.streams)
      theme_meta.polys.forEach((poly: S2PThemePoly) => {
        if (poly.label == "track_profile")
          s2pCanvas.addPolyFromLatLngs(
            "track_profile",
            data.streams.location,
            poly,
          );

        if (poly.label == "elevation_profile")
          s2pCanvas.addFilledPolyFromVector(
            "elevation_profile",
            data.streams.elevation,
            poly,
          );
      });

    if (theme_meta.texts)
      theme_meta.texts.forEach((text) => {
        if (text.label == "user") {
          s2pCanvas.addText(text);
          return;
        }

        if (text.label.includes("_value") && data && data.scalars) {
          let field = text.label.replace("_value", "");
          switch (field) {
            case "distance":
              text.value = (data.scalars.distance / 1000).toFixed(0) + " km";
              break;
            case "time":
              text.value = Converters.secondsToHM(data.scalars.movingTime);
              break;
            case "elevation":
              text.value = data.scalars.elevationGain.toFixed(0) + " m";
              break;
          }
          s2pCanvas.addText(text);
        }
      });

    if (theme_meta.svgs) {
      theme_meta.svgs.forEach((svgTheme) => {
        s2pSvgs.toggleSVG(svgTheme.url, true, svgTheme);
      });
    }
  }

  function onRequestRedraw() {
    s2pCanvas.getCanvas().requestRenderAll();
  }

  function onRequestDelete(
    canvasItem: S2PCanvasPoly | S2PCanvasText | FabricObject | undefined,
  ) {
    if (!canvasItem) return;

    s2pCanvas.remove(canvasItem);
    onRequestRedraw();
  }

  async function onSelectionChanged(selectedObj: FabricObject | undefined) {
    if (!selectedObj) {
      canvasText = undefined;
      canvasPoly = undefined;
      canvasItemSelected = undefined;
      return;
    }

    if ("s2pType" in selectedObj) {
      switch (selectedObj.s2pType) {
        case S2PCanvasItemType.Text: {
          hasFill = hasStroke = hasStrokeWidth = true;
          hasRadius = false;
          canvasText = selectedObj as S2PCanvasText;
          canvasItemSelected = canvasText;
          break;
        }
        case S2PCanvasItemType.Polyline:
        case S2PCanvasItemType.FilledPolyline: {
          hasStroke = hasStrokeWidth = true;
          hasFill = selectedObj.s2pType == S2PCanvasItemType.FilledPolyline;
          hasRadius = false;
          canvasPoly = selectedObj as S2PCanvasPoly;
          canvasItemSelected = canvasPoly;
          break;
        }
        case S2PCanvasItemType.Svg: {
          hasFill = hasStroke = hasStrokeWidth = false;
          hasRadius = false;
          canvasItemSelected = selectedObj as FabricObject;
          break;
        }
        case S2PCanvasItemType.Rect: {
          hasFill = hasStroke = hasStrokeWidth = true;
          hasRadius = true;
          canvasItemSelected = selectedObj as FabricObject;
          break;
        }
      }
    }

    await tick();
    polyProp.onChanged();
  }

  async function onLoadBackground(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    backgroundImgAdded = await s2pCanvas.loadBackground(
      URL.createObjectURL(file),
    );
  }

  export function exportToPng() {
    s2pCanvas.exportToPng();
  }

  function dump() {
    s2pCanvas.dump();
  }

  function selectItem(index: number) {
    currentThemeIdx = index;

    if (themes[currentThemeIdx]) loadTheme(themes[currentThemeIdx]);
  }

  function prev() {
    currentThemeIdx =
      (currentThemeIdx - 1 + themeNames.length) % themeNames.length;
    selectItem(currentThemeIdx);
  }

  function next() {
    currentThemeIdx = (currentThemeIdx + 1) % themeNames.length;
    selectItem(currentThemeIdx);
  }
</script>

<div class="d-flex justify-content-center mb-2">
  <div
    class="btn-group d-flex align-items-center justify-content-center"
    style="width: 100%; max-width: 500px;"
    role="group"
  >
    <button class="btn btn-primary btn-sm" style="flex: 2;" onclick={prev}>
      <i class="bi bi-chevron-left"></i>
    </button>

    <div class="dropdown-center" style="flex: 16;">
      <button
        class="btn btn-outline-secondary btn-sm dropdown-toggle"
        style="border-radius: 0px; width: 100%;"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {themeNames[currentThemeIdx]}
      </button>
      <ul class="dropdown-menu">
        {#each themeNames as item, i}
          <li>
            <a class="dropdown-item" href="#" onclick={() => selectItem(i)}
              >{item}</a
            >
          </li>
        {/each}
      </ul>
    </div>

    <button class="btn btn-primary btn-sm" style="flex: 2;" onclick={next}>
      <i class="bi bi-chevron-right"></i>
    </button>
  </div>
</div>

<div
  class="image-container"
  style="width: 100%; max-width: 500px; margin: auto;"
>
  <S2PCanvas bind:this={s2pCanvas} {onSelectionChanged} />

  <div id="btnGroup" class="btn-group mb-2 d-flex" role="group">
    <button
      type="button"
      onclick={() =>
        s2pCanvas.addText({
          ...new S2PThemeText(),
          value: "text",
          top: s2pCanvas.getCanvas().height / 2,
          left: s2pCanvas.getCanvas().width / 2,
        })}
      class="btn btn-outline-primary"
    >
      <i class="bi bi-fonts">+</i>
    </button>

    <button
      type="button"
      onclick={() =>
        s2pCanvas.addRect({
          left: 100,
          top: 100,
          width: 300,
          height: 100,
          fill: "rgba(255, 255, 255, 0.2)",
          stroke: "rgba(255,0,255, 0.1)",
          strokeWidth: 1,
          rx: 10,
          ry: 10,
        })}
      class="btn btn-outline-primary"
    >
      <i class="bi bi-app">+</i>
    </button>

    <button
      type="button"
      disabled={!canvasItemSelected}
      onclick={() => onRequestDelete(canvasItemSelected)}
      style="z-index: 1;"
      class="btn {canvasItemSelected ? 'btn-danger' : 'btn-outline-danger'}"
    >
      <i class="bi bi-trash"></i></button
    >

    <button
      type="button"
      onclick={() => s2pCanvas.unselectAll()}
      class="btn btn-outline-primary"><i class="bi bi-bounding-box"></i></button
    >

    <button
      type="button"
      class="btn btn-outline-primary"
      onclick={() => {
        if (backgroundImgAdded) {
          s2pCanvas.removeBackground();
          backgroundImgAdded = false;
          return;
        }

        bgInput.click();
      }}
      ><i class="bi {backgroundImgAdded ? 'bi-x-diamond' : 'bi-image'}"></i>
      <input
        bind:this={bgInput}
        onchange={onLoadBackground}
        type="file"
        id="file-input"
        accept="image/*"
        style="display: none;"
      />
    </button>
  </div>

  <div class="mb-2">
    {#if canvasItemSelected}
      <S2PVisualProps
        bind:this={polyProp}
        {canvasItemSelected}
        {onRequestRedraw}
        {hasFill}
        {hasStroke}
        {hasStrokeWidth}
        {hasRadius}
      />
    {/if}
  </div>

  <div class="accordion" id="optionsBox">
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button
          class="accordion-button"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#collapseOne"
          aria-expanded="true"
          aria-controls="collapseOne"
        >
          Icons set
        </button>
      </h2>
      <div
        id="collapseOne"
        class="accordion-collapse collapse show"
        data-bs-parent="#optionsBox"
      >
        <div class="accordion-body">
          <S2PSvgs
            bind:this={s2pSvgs}
            {onRequestRedraw}
            onRequestAdd={s2pCanvas.addSvg}
            onRequestRemove={s2pCanvas.removeSvg}
          />
        </div>
      </div>
    </div>
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button
          class="accordion-button"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#collapseTwo"
          aria-expanded="false"
          aria-controls="collapseTwo"
        >
          Extra options
        </button>
      </h2>
      <div
        id="collapseTwo"
        class="accordion-collapse collapse"
        data-bs-parent="#optionsBox"
      >
        <div class="accordion-body">
          <div style="display: flex; width:100%;" class="mb-1">
            <span class="me-1 font-emp" style="white-space: nowrap;"
              >Text zoom</span
            >
            <input
              oninput={s2pCanvas.onFontScalingChanged}
              bind:value={fontScaling}
              type="range"
              min="0.25"
              max="5"
              step="0.25"
              class="me-1 form-range"
              id="fontScale"
            />
            <span class="me-1">{fontScaling}x</span>
          </div>

          <div>
            <strong>You created a cool theme?</strong> Use the button below to
            export it to the console then copy that text and send it to me.<br
            />
            <button onclick={() => dump()} class="mb-2 btn btn-primary btn-sm"
              >Export theme</button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  #btnGroup > button {
    flex: 1;
  }
</style>
