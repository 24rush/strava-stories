<script lang="ts">
  import { onMount, tick } from "svelte";
  import S2PCanvas from "./S2PCanvas.svelte";
  import S2PSvgs from "./S2PSvgs.svelte";
  import { S2PCanvasText } from "../lib/S2PCanvasText";
  import { Converters } from "../lib/utils/converters";
  import S2PVisualProps from "./S2PVisualProps.svelte";
  import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
  import { S2PTheme, S2PThemePoly, S2PThemeRect } from "../lib/S2PTheme";
  import { S2PCanvasItemType } from "../lib/S2PCanvasItem";
  import type { FabricObject } from "fabric";
  import S2PSliderDropdown from "./S2PSliderDropdown.svelte";
  import { Fonts } from "../lib/utils/fonts";
  import { createPicker } from "../lib/utils/picker";
  import type { S2PSvg } from "../lib/S2PSvg";
  import type { S2PRect } from "../lib/S2PRect";

  export let data: any = {};
  export let themes: S2PTheme[] = [];

  let themesByType: Record<string, string[]> = {};
  let themeMainFont = "";
  let selectedTheme = "";
  let currentThemeIdx = 0;
  let countThemes = 0;

  let bgInput: HTMLInputElement;
  let backgroundImgAdded = false;

  let accentColorPicker: any = null;
  let accentColorPickerEl: HTMLDivElement;

  let s2pCanvas: S2PCanvas;
  let s2pSvgs: S2PSvgs;

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

  let toggleSelectAll: boolean = false;
  let currentSelection: FabricObject[] = [];

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

    onThemeSelected("Trail", "Strava #1");
  });  

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
    if (!theme_meta) return;

    Promise.all(theme_meta.texts.map(t => [t.fontFamily, t.fontWeight]).map(f => document.fonts.load(`${f[1]} 16px "${f[0]}"`)))
        .then(() => document.fonts.ready)
          .then(() =>            
           requestAnimationFrame(() => {    
             _loadTheme(theme_meta);
             onRequestRedraw();
            }
           )
          );
  }

  function _loadTheme(theme_meta: S2PTheme | undefined) {
    s2pCanvas.clear();    
    accentColorPicker.setColor("#ffffff");

    if (!theme_meta) return;

    let canvasWidth = s2pCanvas.getCanvas().width;
    let canvasHeight = canvasWidth * theme_meta.height_percentage;

    if (!s2pCanvas.getCanvas().backgroundImage)
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

    if (theme_meta.texts) {
      if (theme_meta.texts.length > 0)
        themeMainFont = ("Font: " + theme_meta.texts[0]?.fontFamily) ?? "";

      let labelToObj: Record<string, S2PCanvasText> = {};

      theme_meta.texts.forEach((text) => {
        if (text.label == "user") {
          s2pCanvas.addText(text);
          return;
        }

        // Just units, e.g. m, min, km/h
        if (text.label.includes("_value_unit"))
        {
          switch (text.label.replace("_value_unit", "")) {
              case "distance":
              if (data.activityKind.sportType == "Swim")
                text.value = "m";
              else
                text.value = "km";
                break;
              case "time":
                text.value = "min";
                break;
              case "elevation":
                text.value = "m";                
                break;
              case "pace":              
                  if (data.activityKind.sportType == "Swim") {              
                    text.value = "/100m";
                  }
                  else {                  
                    text.value = "/km";
                  }              
                break;
              case "speed":
                text.value = "km/h";
                break;
            }       
        }
        else    
        if (text.label.includes("_value"))
        {
          switch (text.label.replace("_value", "")) {
            case "distance":
            if (data.activityKind.sportType == "Swim")
              text.value = data.scalars.distance ? (data.scalars.distance) : "0";
            else
              text.value = data.scalars.distance ? (data.scalars.distance / 1000).toFixed(0) : "0";
              break;
            case "time":
              text.value = data.scalars.movingTime ? Converters.secondsToHMS(data.scalars.movingTime) : "0";
              break;
            case "elevation":
              text.value = data.scalars.elevationGain
                ? data.scalars.elevationGain.toFixed(0)
                : "0";
                break;
            case "pace":
              if (data.scalars.movingTime && data.scalars.distance) {
                if (data.activityKind.sportType == "Swim") {
                  let pace = (data.scalars.movingTime / data.scalars.distance * 100);                  
                  text.value = `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}`;
                }
                else {
                  let pace = (data.scalars.movingTime) / (data.scalars.distance / 1000);
                  text.value = `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}`;                  
                }
              } else {
                text.value = "0";
              }
              break;
            case "speed":
              text.value = (data.scalars.movingTime && data.scalars.distance) ? ((data.scalars.distance / 1000) / (data.scalars.movingTime / 3600)).toFixed(1) : "0";
              break;
          }
        }

        if (data && data.scalars) {          
          switch (text.label) {
            case "distance":
            if (data.activityKind.sportType == "Swim")
              text.value = data.scalars.distance ? (data.scalars.distance) + "m" : "N/A";
            else
              text.value = data.scalars.distance ? (data.scalars.distance / 1000).toFixed(0) + "km" : "N/A";
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
              if (data.scalars.movingTime && data.scalars.distance) {
                if (data.activityKind.sportType == "Swim") {
                  let pace = (data.scalars.movingTime / data.scalars.distance * 100);                  
                  text.value = `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}/100m`;
                }
                else {
                  let pace = (data.scalars.movingTime) / (data.scalars.distance / 1000);
                  text.value = `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}/km`;                  
                }
              } else {
                text.value = "N/A";
              }
              break;
            case "speed":
              text.value = (data.scalars.movingTime && data.scalars.distance) ? ((data.scalars.distance / 1000) / (data.scalars.movingTime / 3600)).toFixed(1) + "km/h" : "N/A";
              break;
          }
        }

        if (text.value)
          labelToObj[text.label] = s2pCanvas.addText(text);      
      });

      // Find all value_unit and align them to value
      let unitTextObjs = Object.entries(labelToObj).filter(([key]) => key.includes("_value_unit"));
      
      unitTextObjs.forEach(kv => {
        let typeValueUnit = kv[0].replace("_value_unit", "");

        // Find value text box and get it's right
        let valueTextObj = labelToObj[typeValueUnit + "_value"];

        if (valueTextObj) {
          let right = valueTextObj.left + valueTextObj.width;
          kv[1].left = right + 3.5;
        }
      });
    }

    if (theme_meta.svgs) {
      theme_meta.svgs.forEach((svgTheme) => {
        s2pSvgs.loadSvg(svgTheme.url, svgTheme);
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

  async function onSelectionChanged(selectedObjs: FabricObject[]) { 
    currentSelection = s2pCanvas.getCanvas().getActiveObjects();
    
    if (!selectedObjs || !selectedObjs.length) {
      canvasItemSelected = undefined;
      if (polyProp) polyProp.onChanged();

      return;
    }    

    let idxText = selectedObjs.findIndex(o => o instanceof S2PCanvasText);
    idxText = idxText != -1 ? idxText : 0;

    if (selectedObjs[idxText] && "s2pType" in selectedObjs[idxText]) {
      switch (selectedObjs[idxText].s2pType) {
        case S2PCanvasItemType.Text: {
          hasFill = hasStroke = hasStrokeWidth = true;
          hasRadius = false;
          canvasItemSelected = selectedObjs[idxText] as S2PCanvasText;
          break;
        }
        case S2PCanvasItemType.Polyline:
        case S2PCanvasItemType.FilledPolyline: {
          hasFill = hasStroke = hasStrokeWidth = true;          
          hasRadius = false;
          canvasItemSelected = selectedObjs[idxText] as S2PCanvasPoly;
          break;
        }
        case S2PCanvasItemType.Svg: {
          hasFill = hasStroke = hasStrokeWidth = false;
          hasRadius = false;
          canvasItemSelected = selectedObjs[idxText] as S2PSvg;
          break;
        }
        case S2PCanvasItemType.Rect: {
          hasFill = hasStroke = hasStrokeWidth = true;
          hasRadius = true;
          canvasItemSelected = selectedObjs[idxText] as S2PRect;
          break;
        }
      }
    }

    if (currentSelection.length > 1) {
      hasFill = hasStroke = hasStrokeWidth = true;
      hasRadius = true;
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

  export function reloadTheme() {
    if (themes && themes[currentThemeIdx]) {
      selectedTheme = themes[currentThemeIdx]?.name;          
      loadTheme(themes[currentThemeIdx] ?? new S2PTheme(""));            
    }
  }

  async function onThemeSelected(themeType: string, themeName: string) {
    currentThemeIdx =
      themes.findIndex((theme) => theme.name.includes(themeType + ": " + themeName)) ?? 0;

    if (themes[currentThemeIdx] && data.streams) {   
        selectedTheme = themeType + ": " + themeName;
        loadTheme(themes[currentThemeIdx]) ;
        onRequestRedraw();          
    }
  }

  function onFontFamilySelected(fontType: string, fontFamily: string) {
    Promise.all([fontFamily].map(f => document.fonts.load(`16px "${f}"`)))
        .then(() => document.fonts.ready)
          .then(() =>            
           requestAnimationFrame(() => {                     
            s2pCanvas.setFontFamily(fontFamily);
            onRequestRedraw();
            }
           )
          );    
  }

  function onAddTrackProfile() {
    if (!data || !data.streams || !data.streams.location) 
      return;    

    s2pCanvas.addPolyFromLatLngs(
      "track_profile",
      data.streams.location,
      {
        ...new S2PThemePoly(),
        stroke: ["#fc5200", "#fc5200"],
        fill: [null, null],
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
        stroke: ["#fc5200", "#fc5200"],
        fill: ["rgba(0, 128, 255, 0.2)", "rgba(0, 128, 255, 0.2)"],
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
  <i class="mb-2 bi bi-arrow-down" style="transform: scale(1.2);"></i>
 
  <S2PSliderDropdown
    dropdownData={themesByType}
    onItemSelected={onThemeSelected}
    selectedValue={selectedTheme}
  />
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
          ...new S2PThemeRect(),
          left: 100,
          top: 100,
          width: 300,
          height: 100,          
          fill: ["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0.2)"],
          stroke: ["rgba(255,0,255, 0.1)", "rgba(255,0,255, 0.1)"],
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

  <div class="d-flex gap-1" style="flex-direction: row; width: 100%;">
    <div class="d-flex align-items-center" style="flex-direction: column; width: 90%;">
      <div style="width: 100%; padding-top: 3px;">
        <S2PSliderDropdown
          selectedValue={themeMainFont}
          dropdownData={Fonts.fontFamilies}
          onItemSelected={onFontFamilySelected}
        />
      </div>
    </div>

    <div class="d-flex align-items-center" style="flex-direction: column; width: 10%;">
      <div bind:this={accentColorPickerEl}></div>
    </div>
  </div>

  <div class="btn-group mb-2 d-flex" role="group">    
    <button onclick={() => onAddTrackProfile()} class="btn btn-sm btn-outline-primary" style="flex: 1;"
      >Track profile +</button
    >
    <button onclick={() => onAddElevationChart()} class="btn btn-sm btn-outline-primary" style="flex: 1;"
      >Elevation chart +</button
    >
  </div>
  <div class="mb-2">
    {#if canvasItemSelected && canvasItemSelected.s2pType != S2PCanvasItemType.Svg}
      <S2PVisualProps
        bind:this={polyProp}
        {canvasItemSelected}
        {currentSelection}
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
        class="accordion-collapse collapse"
        data-bs-parent="#optionsBox"
      >
        <div class="accordion-body">
          <S2PSvgs
            bind:this={s2pSvgs}
            {onRequestRedraw}
            onRequestAdd={s2pCanvas.addSvg}            
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
          <div class="d-flex mb-2" style="justify-content: space-between; align-items: baseline;">
            <label class="me-1 font-emp" for="defaultCheck1">
              Show text box guides
            </label>
            <input class="form-check-input" id="defaultCheck1" type="checkbox" onchange={s2pCanvas.onShowGuidesChanged}>
          </div>

          <div class="d-flex mb-2" style="justify-content: space-between; align-items: baseline;">
            <div><span class="me-1 font-emp">Background</span><i class="me-1">(will not be exported in final PNG)</i></div>
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
          </div>        

          <div class="d-flex mb-2" style="justify-content: space-between; align-items: baseline;">
            <div><span class="me-1 font-emp">Export theme</span><i class="me-1">The theme will be dumped in the browser console</i></div>
            <button onclick={() => dump()} class="mb-2 btn btn-primary btn-sm"
              >Export</button
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
