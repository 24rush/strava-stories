<script lang="ts">
  import { onMount, tick } from "svelte";
  import S2PCanvas from "./S2PCanvas.svelte";
  import S2PSvgs from "./S2PSvgs.svelte";
  import { S2PCanvasText } from "../lib/S2PCanvasText";
  import { Converters } from "../lib/utils/converters";
  import S2PVisualProps from "./S2PVisualProps.svelte";
  import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
  import { S2PTheme, S2PThemePoly } from "../lib/S2PTheme";
  import { S2PCanvasItemType } from "../lib/S2PCanvasItem";
  import type { FabricObject } from "fabric";
  import S2PSliderDropdown from "./S2PSliderDropdown.svelte";
  import { Fonts } from "../lib/utils/fonts";
  import { createPicker } from "../lib/utils/picker";

  export let data: any = {};
  export let themes: S2PTheme[] = [];

  let themesByType: Record<string, string[]> = {};
  let themeMainFont = "";
  let currentThemeIdx = 0;
  let countThemes = 0;

  let bgInput: HTMLInputElement;
  let backgroundImgAdded = false;

  let accentColorPicker: any = null;
  let accentColorPickerEl: HTMLDivElement;

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

  let toggleSelectAll: boolean = false;

  const isLocalhost = window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";

  onMount(() => {
    if (!themes || !themes.length) return;

    themes.forEach((t) => {
      if (t.ignore && !isLocalhost)
        return;

      let themeTokens: string[] = t.name.split(":");

      let themeType = "Generic";
      let themeName = t.name;

      if (themeTokens.length == 2) {
        themeType = themeTokens[0]?.trim() ?? "Generic";
        themeName = themeTokens[1]?.trim() ?? "unknown";
      }

      if (themeType && themeName) {
        if (!(themeType in themesByType) || !themesByType[themeType])
          themesByType[themeType] = [themeName];
        else themesByType[themeType]?.push(themeName);
      }      

      countThemes++;
    });

    updateObjectPositions(themes);

    accentColorPicker = createPicker(
        accentColorPickerEl,
        "#ffffff",
        (color: any) => {
            s2pCanvas.setAccentColor(color.toHEXA().toString());            
        },
    );

    s2pCanvas.getCanvas().on("mouse:down", (e) => {
      toggleSelectAll = false;      
    });
  });

  export function reloadTheme() {
    if (themes && themes[currentThemeIdx]) {           
      loadTheme(themes[currentThemeIdx] ?? new S2PTheme(""));            
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
          text.fontSize *= canvasWidth;
        });

      if (t.rects)
        t.rects.forEach((rect) => {
          rect.left *= canvasWidth;
          rect.top *= canvasHeight;   
          rect.width *= canvasWidth;
          rect.height *= canvasHeight;          
        });

      if (t.svgs)
        t.svgs.forEach((svgTheme) => {
          svgTheme.left *= canvasWidth;
          svgTheme.top *= canvasHeight;
          svgTheme.width *= canvasWidth;
          svgTheme.height *= canvasHeight;   
        });
    });
  }

  function loadTheme(theme_meta: S2PTheme | undefined) {
    s2pCanvas.clear();
    s2pSvgs.unselectAll();
    accentColorPicker.setColor("#ffffff");

    if (!theme_meta) return;

    let canvasWidth = s2pCanvas.getCanvas().width;
    let canvasHeight = canvasWidth * theme_meta.height_percentage;

    s2pCanvas.getCanvas().setDimensions({
      height: canvasHeight,
    });

    if (theme_meta.polys && data && data.streams)
      theme_meta.polys.forEach((poly: S2PThemePoly) => {
        if (poly.label == "track_profile" && data.streams.location)
          s2pCanvas.addPolyFromLatLngs(
            "track_profile",
            data.streams.location,
            poly,
          );

        if (poly.label == "elevation_profile" && data.streams.elevation)
          s2pCanvas.addFilledPolyFromVector(
            "elevation_profile",
            data.streams.elevation,
            poly,
          );
      });

    if (theme_meta.texts)
      if (theme_meta.texts.length > 0)
        themeMainFont = ("Fonts: " + theme_meta.texts[0]?.fontFamily) ?? "";

    theme_meta.texts.forEach((text) => {
      if (text.label == "user") {
        s2pCanvas.addText(text);
        return;
      }

      if (text.label.includes("_value"))
      {
        if (data && data.scalars) {
          let field = text.label.replace("_value", "");
          switch (field) {
            case "distance":
              text.value = data.scalars.distance ? (data.scalars.distance / 1000).toFixed(0) + " km" : "N/A";
              break;
            case "time":
              text.value = data.scalars.movingTime ? Converters.secondsToHM(data.scalars.movingTime) : "N/A";
              break;
            case "elevation":
              text.value = data.scalars.elevationGain
                ? data.scalars.elevationGain.toFixed(0) + " m"
                : "N/A";
                break;
            case "pace":
              text.value = (data.scalars.movingTime && data.scalars.distance) ? ((data.scalars.movingTime / 60) / (data.scalars.distance / 1000)).toFixed(2).replace('.', ':') + " /km" : "N/A";
              break;
            case "speed":
            text.value = (data.scalars.movingTime && data.scalars.distance) ? ((data.scalars.distance / 1000) / (data.scalars.movingTime / 3600)).toFixed(1) + " km/h" : "N/A";
              break;
          }
          s2pCanvas.addText(text);
        } else {
          text.value = "N/A";
          s2pCanvas.addText(text);
        }
      }
    });

    if (theme_meta.svgs) {
      theme_meta.svgs.forEach((svgTheme) => {
        s2pSvgs.toggleSVG(svgTheme.url, true, svgTheme);
      });
    }

    if (theme_meta.rects) {
      theme_meta.rects.forEach(rect => {
        s2pCanvas.addRect(rect);
      });
    }

    s2pCanvas.unselectAll();
  }

  function onRequestRedraw() {
    s2pCanvas.getCanvas().requestRenderAll();
  }

  function onRequestDelete(
    canvasItem: S2PCanvasPoly | S2PCanvasText | FabricObject | undefined,
  ) {
    if (!canvasItem) return;

    s2pCanvas.deleteActiveObjects();
    toggleSelectAll = false;       
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
          hasFill = true; //selectedObj.s2pType == S2PCanvasItemType.FilledPolyline;
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
    if (polyProp)
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

  function onThemeSelected(themeType: string, themeName: string) {
    currentThemeIdx =
      themes.findIndex((theme) => theme.name.includes(themeType + ": " + themeName)) ?? 0;

    if (themes[currentThemeIdx]) {       
      loadTheme(themes[currentThemeIdx]);
    }
  }

  function onFontFamilySelected(fontType: string, fontFamily: string) {
    s2pCanvas.setFontFamily(fontFamily);
  }

  function onAddTrackProfile() {
    if (!data || !data.streams || !data.streams.location) 
      return;    

    s2pCanvas.addPolyFromLatLngs(
      "track_profile",
      data.streams.location,
      {
        ...new S2PThemePoly(),
        scaleX: 0.5,
        scaleY: 0.5,
        top: s2pCanvas.getCanvas().height / 4,
        left: s2pCanvas.getCanvas().width / 4,
      }
    );    
  }

  function onAddElevationChart() {
    if (!data || !data.streams || !data.streams.elevation) 
      return;

    s2pCanvas.addFilledPolyFromVector(
      "elevation_profile",
      data.streams.elevation,
      {
        ...new S2PThemePoly(),
        scaleX: 0.5,
        scaleY: 0.5,
        top: s2pCanvas.getCanvas().height / 4,
        left: s2pCanvas.getCanvas().width / 4,
      }
    );
  }

</script>

<div
  class="d-flex justify-content-center align-items-center mb-2"
  style="flex-direction: column; max-width: 600px; width: 100%; margin: auto;"
>
  <span class="me-1 mb-1" style="font-style: italic;">layout</span>

  <S2PSliderDropdown
    dropdownData={themesByType}
    onItemSelected={onThemeSelected}
  />

  <div class="d-flex gap-1" style="flex-direction: row; width: 100%;">
    <div class="d-flex align-items-center" style="flex-direction: column; width: 90%;">
      <span class="me-1 mb-1" style="font-style: italic;">font</span>
      <div style="width: 100%; padding-top: 3px;">
        <S2PSliderDropdown
          selectedValue={themeMainFont}
          dropdownData={Fonts.fontFamilies}
          onItemSelected={onFontFamilySelected}
        />
      </div>
    </div>

    <div class="d-flex align-items-center" style="flex-direction: column; width: 10%;">
      <span class="me-1 mb-1" style="font-style: italic;">color</span>
      <div bind:this={accentColorPickerEl}></div>
    </div>
  </div>

</div>

<div
  class="image-container"
  style="width: 100%; max-width: 600px; margin: auto;"
>
  <S2PCanvas bind:this={s2pCanvas} {onSelectionChanged} />

  <div id="btnGroup" class="btn-group mb-2 d-flex" role="group">
    <button
      type="button"
      onclick={e => s2pCanvas.addTextAtPos(
        "text",
        s2pCanvas.getCanvas().width / 2,
        s2pCanvas.getCanvas().height / 2,
        (canvasItemSelected && "s2pType" in canvasItemSelected && canvasItemSelected.s2pType == S2PCanvasItemType.Text) ? (canvasItemSelected as S2PCanvasText).textProps : undefined
      )}
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
      onclick={() => {
          toggleSelectAll ? s2pCanvas.unselectAll() : s2pCanvas.selectAll();
          toggleSelectAll = !toggleSelectAll;
        }}
      class="btn btn-outline-primary"><i class="bi {toggleSelectAll ? "bi-collection-fill" : "bi-collection"}"></i></button
    >

    <button
    type="button"
    onclick={() => exportToPng()}
    class="btn btn-outline-primary"><i class="bi bi-download"></i></button
  >

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
  <div class="btn-group mb-2 d-flex" role="group">    
      <button onclick={() => onAddTrackProfile()} class="btn btn-outline-primary"
        >Track profile +</button
      >
      <button onclick={() => onAddElevationChart()} class="btn btn-outline-primary"
        >Elevation chart +</button
      >
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
          <div class="d-flex mb-1" style="justify-content: space-between;">
            <label class="me-1 font-emp" for="defaultCheck1">
              Show text box guides
            </label>
            <input class="form-check-input" id="defaultCheck1" type="checkbox" onchange={s2pCanvas.onShowGuidesChanged}>
          </div>

          <span class="me-1 font-emp"
          >Background</span><i class="me-1">(will not be exported in final PNG)</i>

          <button
          type="button"
          class="btn btn-sm btn-primary"
          onclick={() => {
            if (backgroundImgAdded) {
              s2pCanvas.removeBackground();
              backgroundImgAdded = false;
              return;
            }
    
            bgInput.click();
          }}
          ><span>{backgroundImgAdded ? 'Remove' : 'Add'}</span>
          <input
            bind:this={bgInput}
            onchange={onLoadBackground}
            type="file"
            id="file-input"
            accept="image/*"
            style="display: none;"
          />
        </button>
        
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
