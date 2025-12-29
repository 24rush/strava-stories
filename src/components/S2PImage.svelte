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
  import S2PSuggestedColors from "./S2PSuggestedColors.svelte";
  import type { FieldMappings, StravaData } from "../lib/utils/fieldmappings";
  
  let {
        data,
        fieldMappings,
        themes,
  }: {
        data: StravaData;
        fieldMappings: FieldMappings;
        themes: S2PTheme[];
  } = $props();  

  let themesByType: Record<string, string[]> = $state({});
  let themeMainFont = $state("");
  let selectedTheme = $state("");
  let currentThemeIdx = 0;
  let countThemes = 0;

  let accentColorPicker: any = null;
  let accentColorPickerEl: HTMLDivElement;

  let s2pCanvas: S2PCanvas;
  let s2pSvgs: S2PSvgs;
  let s2pSuggestedColors: S2PSuggestedColors;

  let canvasItemSelected:
    | S2PCanvasPoly
    | S2PCanvasText
    | FabricObject
    | undefined = $state(undefined);

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

  function getUnitMeasurementForType(type: string): string | undefined {
    type = type.replace("_value_unit", "");

    switch (type) {
      case "distance":
        if (data.activityKind.sportType == "Swim") return "m";
        else return (data.scalars.distance > 999) ? "km" : "m";    
      case "time":
        return "";//"min";
      case "elevation":
        return "m";     
      case "pace":              
        if (data.activityKind.sportType == "Swim")             
          return "/100m";        
        else
          return"/km";
      case "calories":
        return "kcal";
      case "avgpower":
      case "maxpower":
        return "W";
      case "speed":
        return "km/h";
      case "total_active_days":
        return "";
      case "total_distance":
        return "km";
      case "total_time":
        return "hrs";
      case "total_elevation":
        return "m";
      default:
        return undefined;
    }
  }

  function getValueForType(type: string): string | number | undefined {
    type = type.replace("_value", "");

    switch (type) {
      case "distance":
        if (data.activityKind.sportType == "Swim")
          return data.scalars.distance ? (data.scalars.distance) : 0;
        else {
          let divider = data.scalars.distance > 999 ? 1000 : 1;          
          return data.scalars.distance ? (data.scalars.distance / divider).toFixed(0) : 0;
        }
      case "time":
        return data.scalars.movingTime ? Converters.secondsToHMS(data.scalars.movingTime) : 0;
      case "elevation":
        return data.scalars.elevationGain
          ? data.scalars.elevationGain.toFixed(0)
          : 0;
      case "pace":
        if (data.scalars.movingTime && data.scalars.distance) {
          if (data.activityKind.sportType == "Swim") {
            let pace = (data.scalars.movingTime / data.scalars.distance * 100);                  
            return `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}`;
          }
          else {
            let pace = (data.scalars.movingTime) / (data.scalars.distance / 1000);
            return `${String(Math.floor(pace / 60)).padStart(2, '0')}:${String(Math.floor(pace % 60)).padStart(2, '0')}`;                  
          }
        } else {
          return 0;
        }            
      case "speed":
        return (data.scalars.movingTime && data.scalars.distance) ? ((data.scalars.distance / 1000) / (data.scalars.movingTime / 3600)).toFixed(1) : 0;
      
      case "calories":
          return data.scalars.calories;
      case "avgpower":
        return data.scalars.avgpower;
      case "maxpower":
       return data.scalars.maxpower;
          
      case "total_active_days":
      case "total_distance":
      case "total_time":
      case "total_elevation":
        return fieldMappings.getValue(type);
      default:        
        return undefined;
    }
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
          text.value = getUnitMeasurementForType(text.label);                 
        else    
          if (text.label.includes("_value"))                  
            text.value = (getValueForType(text.label) ?? text.value).toString();        
        
        switch (text.label) {
          case "distance": 
          case "time":            
          case "elevation":             
          case "pace":          
          case "speed":

          case "calories":
          case "avgpower":
          case "maxpower":
          if (data && data.scalars) {
            let value = getValueForType(text.label);
            if (!value)
              text.value = "N/A";
            else
              text.value = value + (getUnitMeasurementForType(text.label) ?? "");
          }

          case "total_active_days": {
            let value = getValueForType(text.label);
            if (!value)
              text.value = "N/A";
            else
              text.value = value + (getUnitMeasurementForType(text.label) ?? "");
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
    s2pSuggestedColors.setPickerColors();
    alignUnitsWithValues();
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

  export function exportToPng() {
    s2pCanvas.exportToPng();
  }

  function dump() {
    s2pCanvas.dump();
  }

  export function reloadTheme(themeIdx?: number) {
    if (!themeIdx) {
      let keyworkToSearch = "";
      if (data.activityKind.sportType.includes("Swim"))
        keyworkToSearch = "Swim";
      
      if (data.activityKind.sportType.includes("Run"))
        keyworkToSearch = "Run";

      if (data.activityKind.sportType.includes("Ride"))
        keyworkToSearch = "Cycling";

      themeIdx = themes.findIndex(t => t.name.includes(keyworkToSearch));

      if (themeIdx == -1)
        themeIdx = currentThemeIdx;
    }

    if (themes && themes[themeIdx]) {
      selectedTheme = themes[themeIdx]?.name ?? "";   
      loadTheme(themes[themeIdx] ?? new S2PTheme(""));            
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

  function onSuggestedColorsChangedEvent(showSuggestedColors: boolean) {
    if (!showSuggestedColors) {
      reloadTheme(currentThemeIdx);
    }
  }

  function onBackgroundRemoved() {
    let objects = s2pCanvas.getObjects();

    objects.texts.forEach(t => t.resetColor());
    objects.rects.forEach(r => r.resetColor());
    objects.polys.forEach(p => p.resetColor());

    onRequestRedraw();
  }

  export function updateTextsValue(label: string, newValue: string) {
    s2pCanvas.getObjects().texts.forEach(text => {
      if (text.label === "user") 
        return;
      
      let value = getValueForType(text.label);
      let unit = getUnitMeasurementForType(text.label);
      
      if (text.label.includes("_value_unit")) {
        text.set('text', unit ?? "");
      }
      else
        if (text.label.includes("_value")) {
          text.set('text', (value ?? "N/A") + ((value && unit) ? unit : ""));
        }
        else
          text.set('text', (value ?? "N/A") + ((value && unit) ? unit : ""));
    });

    alignUnitsWithValues();
    onRequestRedraw();
  }

  function alignUnitsWithValues() {
    let texts = s2pCanvas.getObjects().texts;
    let units = texts.filter(t => t.label.includes("_value_unit"));
    let values = texts.filter(t => t.label.includes("_value") && !t.label.includes("_unit"));

    units.forEach(u => {
      let field = u.label.replace("_value_unit", "");
      let textValueForField = values.find(v => v.label == field + "_value");

      if (textValueForField) {
        u.left = textValueForField.getBoundingRect().width + textValueForField.left;
      }
    });
  }


</script>

<div
  class="d-flex justify-content-center align-items-center mb-2"
  style="flex-direction: column; max-width: 600px; width: 100%; margin: auto;"
> 
  <i class="mb-2 bi bi-arrow-down" style="transform: scale(1.2);"></i>
 
  <div class="mb-2">
    <S2PSuggestedColors bind:this={s2pSuggestedColors} {s2pCanvas} {onRequestRedraw} {onSuggestedColorsChangedEvent} 
    {onBackgroundRemoved}/>
  </div>

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
