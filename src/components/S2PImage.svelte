<script lang="ts">
  import { onMount, tick } from "svelte";
  import S2PCanvas from "./S2PCanvas.svelte";
  import S2PSvgs from "./S2PSvgs.svelte";
  import { S2PCanvasText } from "../lib/S2PCanvasText";
  import S2PVisualProps from "./S2PVisualProps.svelte";
  import { S2PCanvasPoly } from "../lib/S2PCanvasPoly";
  import { S2PTheme, S2PThemeObject } from "../lib/S2PTheme";
  import { S2PCanvasItemType } from "../lib/S2PCanvasItem";
  import { util, type FabricObject } from "fabric";
  import S2PSliderDropdown from "./S2PSliderDropdown.svelte";
  import { Fonts } from "../lib/utils/fonts";
  import type { S2PRect } from "../lib/S2PRect";
  import S2PSuggestedColors from "./S2PSuggestedColors.svelte";
  import { DataSource, FieldId } from "../lib/utils/fieldmappings";
  import { decreaseHexaOpacity } from "../lib/utils/colors";
  import type { S2PSplits } from "../lib/S2PSplits";
  import S2PAnimationEditor from "./S2PAnimationEditor.svelte";
  import { S2PSvg } from "../lib/S2PSvg";
  import type { S2PClimbs } from "../lib/S2PClimbs";

  let {
    source,
    themes,
  }: {
    source: DataSource;
    themes: S2PTheme[];
  } = $props();

  let themesByType: Record<string, string[]> = $state({});
  let themeMainFont = $state("");
  let themeMainFontSlider: S2PSliderDropdown;
  let selectedTheme = $state("");
  let currentThemeIdx = 0;
  let countThemes = 0;

  let s2pCanvas: S2PCanvas;
  let s2pSvgs: S2PSvgs;
  let s2pSuggestedColors: S2PSuggestedColors;

  let canvasItemSelected:
    | S2PCanvasPoly
    | S2PCanvasText
    | FabricObject
    | undefined = $state(undefined);

  let polyProp: S2PVisualProps;

  let hasHeartRate = $state(false);
  let hasTrackProfile = $state(false);
  let hasElevation = $state(false);
  let hasSplitsData = $state(false);

  let toggleSelectAll: boolean = false;
  let currentSelection: FabricObject[] = [];

  let hasAnimations = $state(false);
  let maxAnimationDuration = $state(0);
  let s2pAnimationEditor: S2PAnimationEditor;
  let runningAnimations: (util.TAnimation<number> | null)[] = [];

  let isVideoExporting = $state(false);

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";

  onMount(() => {
    if (!themes || !themes.length) return;

    themes.forEach((t) => {
      if (t.ignore && !isLocalhost) return;

      let themeTokens: string[] = t.name.split("-");

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

    s2pCanvas.getCanvas().on("mouse:down", (e) => {
      toggleSelectAll = false;
    });
  });

  function updateObjectPositions(themes: S2PTheme[]) {
    let canvasWidth = s2pCanvas.getCanvas().width;

    themes.forEach((t) => {
      let canvasHeight = canvasWidth * t.height_percentage;

      if (t.polys)
        t.polys.forEach((poly: S2PThemeObject) => {
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

      if (t.splits)
        t.splits.forEach((splitTheme) => {
          splitTheme.left *= canvasWidth;
          splitTheme.top *= canvasHeight;
          splitTheme.width *= canvasWidth;
          splitTheme.height *= canvasHeight;
          splitTheme.barHeight *= canvasHeight / splitTheme.scaleY;
          splitTheme.barGap *= canvasHeight / splitTheme.scaleY;
        });

      if (t.climbs)
        t.climbs.forEach((climbTheme) => {
          climbTheme.left *= canvasWidth;
          climbTheme.top *= canvasHeight;
          climbTheme.width *= canvasWidth;
          climbTheme.height *= canvasHeight;
          climbTheme.barHeight *= canvasHeight / climbTheme.scaleY;
          climbTheme.barGap *= canvasHeight / climbTheme.scaleY;
        });
    });
  }

  function loadTheme(theme_meta: S2PTheme | undefined) {
    if (!theme_meta) return;

    Promise.all(
      theme_meta.texts
        .map((t) => [t.fontFamily, t.fontWeight])
        .map((f) => document.fonts.load(`${f[1]} 16px "${f[0]}"`)),
    )
      .then(() => document.fonts.ready)
      .then(() =>
        requestAnimationFrame(() => {
          _loadTheme(theme_meta);
          onRequestRedraw();
        }),
      );
  }

  function _loadTheme(theme_meta: S2PTheme | undefined) {
    onAbortAnimationRequested();
    hasAnimations = false;

    s2pCanvas.clear();
    hasHeartRate =
      source.data.hasHeartRate && source.data.streams.heartrate.length > 0;
    hasTrackProfile = source.data.streams.location.length > 0;
    hasElevation = source.data.streams.elevation.length > 0;
    hasSplitsData = source.data.splits_metric.length > 0;

    if (!theme_meta) return;

    let canvasWidth = s2pCanvas.getCanvas().width;
    let canvasHeight = canvasWidth * theme_meta.height_percentage;

    if (!s2pCanvas.getCanvas().backgroundImage)
      s2pCanvas.getCanvas().setDimensions({
        height: canvasHeight,
      });

    if (theme_meta.climbs) {
      theme_meta.climbs.forEach((climb) => {
        s2pCanvas.addClimbsCharts(source.data, climb);
      });
    }

    if (theme_meta.splits && source.data.splits_metric) {
      theme_meta.splits.forEach((split) => {
        s2pCanvas.addSplitsCharts(source.data.splits_metric, split);
      });
    }

    if (theme_meta.polys && source && source.data.streams)
      theme_meta.polys.forEach((poly: S2PThemeObject) => {
        if (poly.label == "track_profile" && source.data.streams.location) {
          s2pCanvas.addPolyFromLatLngs(
            "track_profile",
            source.data.streams.location,
            poly,
          );
        }

        if (
          poly.label == "elevation_profile" &&
          source.data.streams.elevation
        ) {
          s2pCanvas.addFilledPolyFromVector(
            "elevation_profile",
            source.data.streams.elevation,
            poly,
          );
        }
      });

    if (theme_meta.texts) {
      if (theme_meta.texts.length > 0) {
        themeMainFont = "Font - " + theme_meta.texts[0]?.fontFamily ?? "";
        themeMainFontSlider.onSelectedItemChanged(themeMainFont);
      }

      let labelToObj: Record<string, S2PCanvasText> = {};

      theme_meta.texts.forEach((text) => {
        if (text.label == "user") {
          s2pCanvas.addText(text);
          return;
        }

        let fieldLabelStripped = text.label
          .replace("_value_unit", "")
          .replace("_value", "");

        // Just units, e.g. m, min, km/h
        if (text.label.includes("_value_unit"))
          text.value = source.getUnitForField(fieldLabelStripped);
        else if (text.label.includes("_value"))
          text.value =
            (
              source.getValueForField(fieldLabelStripped) ?? text.value
            )?.toString() ?? "";
        else {
          let value = source.getValueForField(fieldLabelStripped);
          if (value == undefined) text.value = "N/A";
          else {
            text.value = value.toString();
            if (fieldLabelStripped != FieldId.MovingTime)
              text.value += source.getUnitForField(fieldLabelStripped) ?? "";
          }
        }

        if (text.value) labelToObj[text.label] = s2pCanvas.addText(text);
      });

      // Find all value_unit and align them to value
      let unitTextObjs = Object.entries(labelToObj).filter(([key]) =>
        key.includes("_value_unit"),
      );

      unitTextObjs.forEach((kv) => {
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
      theme_meta.rects.forEach((rect) => {
        s2pCanvas.addRect(rect);
      });
    }

    s2pCanvas.unselectAll();
    s2pSuggestedColors.setPickerColors();
    alignUnitsWithValues();
    s2pCanvas.resetSlidersToMedian();

    let canvasObjects = s2pCanvas.getObjects();
    hasAnimations =
      canvasObjects.polys.length > 0 ||
      canvasObjects.splits.length > 0 ||
      canvasObjects.climbs.length > 0;
    if (hasAnimations && s2pAnimationEditor) {
      onAnimationDurationChanged(maxAnimationDuration);
      s2pAnimationEditor.onNewLayout();
    }
    if (maxAnimationDuration == 0)
      maxAnimationDuration = s2pCanvas.getMaxAnimationDuration();
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

    let canvasObjects = s2pCanvas.getObjects();
    hasAnimations =
      canvasObjects.polys.length > 0 || canvasObjects.splits.length > 0;
  }

  async function onSelectionChanged(selectedObjs: FabricObject[]) {
    currentSelection = s2pCanvas.getCanvas().getActiveObjects();

    if (!selectedObjs || !selectedObjs.length) {
      canvasItemSelected = undefined;
    } else {
      let idxText = selectedObjs.findIndex((o) => o instanceof S2PCanvasText);
      idxText = idxText != -1 ? idxText : 0;

      if (selectedObjs[idxText] && "s2pType" in selectedObjs[idxText]) {
        canvasItemSelected = selectedObjs[idxText];
      }
    }

    await tick();
    if (polyProp) polyProp.onChanged();
  }

  export function reloadTheme(themeIdx?: number) {
    if (!themeIdx) {
      let keyworkToSearch = "";
      if (source.data.activityKind.sportType.includes("Swim"))
        keyworkToSearch = "Swim";

      if (source.data.activityKind.sportType.includes("Run"))
        keyworkToSearch = "Run";

      if (source.data.activityKind.sportType.includes("Trail"))
        keyworkToSearch = "Trail";

      if (source.data.activityKind.sportType.includes("Ride"))
        keyworkToSearch = "Cycling";

      themeIdx = themes.findIndex((t) => t.name.includes(keyworkToSearch));

      if (themeIdx == -1) themeIdx = currentThemeIdx;
    }

    if (themes && themes[themeIdx]) {
      selectedTheme = themes[themeIdx]?.name ?? "";
      loadTheme(themes[themeIdx] ?? new S2PTheme(""));
    }
  }

  async function onThemeSelected(themeType: string, themeName: string) {
    currentThemeIdx =
      themes.findIndex((theme) =>
        theme.name.includes(themeType + " - " + themeName),
      ) ?? 0;

    if (themes[currentThemeIdx] && source.data.streams) {
      selectedTheme = themeType + " - " + themeName;
      loadTheme(themes[currentThemeIdx]);
      onRequestRedraw();
    }
  }

  function onFontFamilySelected(fontType: string, fontFamily: string) {
    Promise.all([fontFamily].map((f) => document.fonts.load(`16px "${f}"`)))
      .then(() => document.fonts.ready)
      .then(() =>
        requestAnimationFrame(() => {
          s2pCanvas.setFontFamily(fontFamily);
          alignUnitsWithValues();
          onRequestRedraw();
        }),
      );
  }

  function onAddTrackProfile() {
    if (!source.data.streams || !source.data.streams.location) return;

    let colors = s2pSuggestedColors.getCurrentColors();

    s2pCanvas.addPolyFromLatLngs(
      "track_profile",
      source.data.streams.location,
      new S2PThemeObject({
        stroke: [colors[1] ?? null, colors[2] ?? null],
        fill: [null, null],
        scaleX: 0.5,
        scaleY: 0.5,
        top: s2pCanvas.getCanvas().height / 4,
        left: s2pCanvas.getCanvas().width / 4,
      }),
    );

    hasAnimations = true;
    onRequestRedraw();
  }

  function onAddElevationChart() {
    if (!source.data.streams || !source.data.streams.elevation) return;

    let colors = s2pSuggestedColors.getCurrentColors();

    s2pCanvas.addFilledPolyFromVector(
      "elevation_profile",
      source.data.streams.elevation,
      new S2PThemeObject({
        scaleX: 0.5,
        scaleY: 0.5,
        stroke: [colors[1] ?? null, colors[2] ?? null],
        fill: [
          decreaseHexaOpacity(colors[1], 0.4),
          decreaseHexaOpacity(colors[2], 0.4),
        ],
        top: s2pCanvas.getCanvas().height / 4,
        left: s2pCanvas.getCanvas().width / 4,
      }),
    );

    hasAnimations = true;
    onRequestRedraw();
  }

  function onAddHeartrateChart() {
    if (!source.data.streams || !source.data.streams.heartrate) return;

    let colors = s2pSuggestedColors.getCurrentColors();

    s2pCanvas.addFilledPolyFromVector(
      "heartrate_profile",
      source.data.streams.heartrate,
      new S2PThemeObject({
        scaleX: 0.5,
        scaleY: 0.5,
        stroke: [colors[1] ?? null, colors[2] ?? null],
        fill: [
          decreaseHexaOpacity(colors[1], 0.4),
          decreaseHexaOpacity(colors[2], 0.4),
        ],
        top: s2pCanvas.getCanvas().height / 4,
        left: s2pCanvas.getCanvas().width / 4,
      }),
    );

    hasAnimations = true;
    onRequestRedraw();
  }

  function onAddSplitsChart() {
    if (!source.data.splits_metric) return;

    let colors = s2pSuggestedColors.getCurrentColors();

    s2pCanvas.addSplitsCharts(
      source.data.splits_metric,
      new S2PThemeObject({
        label: "splits_profile",
        barGap: 1,
        barHeight: 20,
        textColor: [colors[0] ?? null, colors[0] ?? null],
        fill: [
          decreaseHexaOpacity(colors[1], 0.4),
          decreaseHexaOpacity(colors[2], 0.4),
        ],
        stroke: [null, null],
        strokeWidth: 0,
        top: s2pCanvas.getCanvas().height * 0.05,
        left: s2pCanvas.getCanvas().width * 0.05,
        height: s2pCanvas.getCanvas().height * 0.9,
        width: s2pCanvas.getCanvas().width * 0.9,
        fontFamily: themeMainFont.replace("Font - ", ""),
      }),
    );

    hasAnimations = true;
    onRequestRedraw();
  }

  function onSuggestedColorsChangedEvent(showSuggestedColors: boolean) {
    if (!showSuggestedColors) {
      onBackgroundRemoved();
    }
  }

  function onBackgroundRemoved() {
    let objects = s2pCanvas.getObjects();

    objects.texts.forEach((t) => t.resetColor());
    objects.rects.forEach((r) => r.resetColor());
    objects.polys.forEach((p) => p.resetColor());
    objects.splits.forEach((s) => s.resetColor());
    objects.climbs.forEach((c) => c.resetColor());

    onRequestRedraw();
  }

  export function updateTextsValue(canvasText?: S2PCanvasText) {
    (canvasText ? [canvasText] : s2pCanvas.getObjects().texts).forEach(
      (text) => {
        if (text.label === "user") return;

        let value = source
          .getValueForField(text.label.replace("_value", ""))
          ?.toString();
        let unit = source.getUnitForField(
          text.label.replace("_value_unit", ""),
        );

        if (text.label.includes("_value_unit")) text.set("text", unit);
        else if (text.label.includes("_value"))
          text.set("text", value ?? "N/A");
        else if (!text.label.includes(FieldId.MovingTime))
          text.set("text", (value ?? "N/A") + (value ? unit : ""));
        else text.set("text", unit ?? "N/A");
      },
    );

    alignUnitsWithValues();
    if (polyProp) polyProp.onChanged();

    onRequestRedraw();
  }

  function alignUnitsWithValues() {
    let texts = s2pCanvas.getObjects().texts;
    let units = texts.filter((t) => t.label.includes("_value_unit"));
    let values = texts.filter(
      (t) => t.label.includes("_value") && !t.label.includes("_unit"),
    );

    units.forEach((u) => {
      let field = u.label.replace("_value_unit", "");
      let textValueForField = values.find((v) => v.label == field + "_value");

      if (textValueForField) {
        u.left =
          textValueForField.getBoundingRect().width + textValueForField.left;
      }
    });
  }

  function isNullOfTransparent(color: string | null): boolean {
    return !color || color.toLowerCase() == "#ffffff00";
  }

  function updatePolyColor(
    p: S2PCanvasPoly,
    gradientIndex: number,
    color: any,
  ) {
    let colorStr = color.toHEXA().toString();
    let moreAlphaColorStr = decreaseHexaOpacity(colorStr, 0.5);

    if (!isNullOfTransparent(p.getStrokeStop(gradientIndex)))
      p.setStrokeStop(gradientIndex, colorStr);

    if (!p.isPolyline && !isNullOfTransparent(p.getFillStop(gradientIndex)))
      p.setFillStop(gradientIndex, moreAlphaColorStr);
  }

  function updateRectColor(
    r: S2PRect | S2PSplits | S2PClimbs,
    gradientIndex: number,
    color: any,
  ) {
    let colorStr = color.toHEXA().toString();
    let moreAlphaColorStr = decreaseHexaOpacity(colorStr, 0.5);

    if (!isNullOfTransparent(r.getStrokeStop(gradientIndex)))
      r.setStrokeStop(gradientIndex, colorStr);

    if (!isNullOfTransparent(r.getFillStop(gradientIndex)))
      r.setFillStop(gradientIndex, moreAlphaColorStr);
  }

  function onGradientChanged(type: number, color: any) {
    s2pCanvas
      .getObjects()
      .rects.forEach((r) => updateRectColor(r, type, color));
    s2pCanvas
      .getObjects()
      .polys.forEach((p) => updatePolyColor(p, type, color));
    s2pCanvas
      .getObjects()
      .splits.forEach((s) => updateRectColor(s, type, color));
    s2pCanvas
      .getObjects()
      .climbs.forEach((c) => updateRectColor(c, type, color));

    if (polyProp) polyProp.onChanged();
    onRequestRedraw();
  }

  function onSolidColorChanged(color: any) {
    let colorStr = color.toHEXA().toString();
    let moreAlphaColorStr = decreaseHexaOpacity(colorStr);

    let canvasObjs = s2pCanvas.getObjects();

    canvasObjs.texts.forEach((t) => {
      let isUnit = t.label.includes("_value_unit");

      t.setFillStop(0, isUnit ? moreAlphaColorStr : colorStr);
      t.setFillStop(1, isUnit ? moreAlphaColorStr : colorStr);
    });

    [canvasObjs.splits, canvasObjs.climbs].forEach((objs) =>
      objs.forEach((s) => {
        s.setTextGradient(colorStr);
      }),
    );

    onRequestRedraw?.();
  }

  function onStartAnimationRequested() {
    let objects = s2pCanvas.getObjects();
    [objects.polys, objects.splits, objects.climbs].forEach((object) => {
      object.forEach(async (canvasItem) => {
        let animations = await canvasItem.startAnimation();
        if (animations) runningAnimations.push(...animations);
      });
    });
  }

  function onAbortAnimationRequested() {
    runningAnimations.forEach((ra) => {
      if (ra) ra.abort();
    });

    runningAnimations = [];
  }

  function onAnimationDurationChanged(v: number) {
    maxAnimationDuration = v;
    let objects = s2pCanvas.getObjects();
    [objects.polys, objects.splits, objects.climbs].forEach((object) => {
      object.forEach((canvasItem) => {
        let settings = canvasItem.animationSettings;
        settings.duration = v;
      });
    });
  }
</script>

<div
  class="d-flex justify-content-center align-items-center mb-2"
  style="flex-direction: column; max-width: 600px; width: 100%; margin: auto;"
>
  <i class="mb-1 bi bi-arrow-down" style="transform: scale(1.2);"></i>

  <div>
    <S2PSuggestedColors
      bind:this={s2pSuggestedColors}
      {s2pCanvas}
      {onSuggestedColorsChangedEvent}
      {onGradientChanged}
      {onSolidColorChanged}
      {onBackgroundRemoved}
    />
  </div>

  <i class="mb-1 bi bi-arrow-down" style="transform: scale(1.2);"></i>

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
    <div class="btn-group" style="flex: 2;">
      <button
        type="button"
        title="Add text"
        onclick={(e) =>
          s2pCanvas.addTextAtPos(
            "text",
            s2pCanvas.getCanvas().width / 2,
            s2pCanvas.getCanvas().height / 2,
            canvasItemSelected &&
              "s2pType" in canvasItemSelected &&
              canvasItemSelected.s2pType == S2PCanvasItemType.Text
              ? (canvasItemSelected as S2PCanvasText).textProps
              : undefined,
          )}
        class="btn btn-outline-primary"
      >
        <i class="bi bi-fonts"></i>
      </button>

      <button
        type="button"
        title="Add rectangle"
        onclick={() => {
          let colors = s2pSuggestedColors.getCurrentColors();
          s2pCanvas.addRect(
            new S2PThemeObject({
              left: 100,
              top: 100,
              width: 300,
              height: 100,
              fill: [colors[1], colors[2]],
              stroke: [colors[0], colors[0]],
              strokeWidth: 1,
              rx: 10,
              ry: 10,
            }),
          );
        }}
        class="btn btn-outline-primary"
      >
        <i class="bi bi-app"></i>
      </button>

      <button
        type="button"
        title="Select all items"
        onclick={() => {
          toggleSelectAll ? s2pCanvas.unselectAll() : s2pCanvas.selectAll();
          toggleSelectAll = !toggleSelectAll;
        }}
        class="btn btn-outline-primary"
      >
        <i
          class="bi {toggleSelectAll
            ? 'bi-dash-square-dotted'
            : 'bi-plus-square-dotted'}"
        ></i></button
      >
    </div>

    <button
      type="button"
      disabled={!canvasItemSelected}
      onclick={() => onRequestDelete(canvasItemSelected)}
      style="z-index: 1;"
      class="btn {canvasItemSelected ? 'btn-danger' : 'btn-outline-danger'}"
    >
      <i class="bi bi-trash"></i></button
    >

    <div class="btn-group" style="flex: 2;">
      <button
        type="button"
        title="Copy to clipboard"
        onclick={() => s2pCanvas.copyCanvasToClipboard()}
        class="btn btn-outline-primary"
      >
        <i class="bi bi-clipboard"></i>
      </button>

      <button
        type="button"
        title="Download as PNG"
        onclick={() => s2pCanvas.exportToPng()}
        class="btn btn-outline-primary"
      >
        <i class="bi bi-download"></i>
      </button>

      <button
        disabled={isVideoExporting || !hasAnimations}
        type="button"
        title="Download as Video"
        onclick={() => {
          onAbortAnimationRequested();
          isVideoExporting = true;
          s2pCanvas.exportToWebM().then((v) => (isVideoExporting = false));
        }}
        class="btn btn-outline-primary"
      >
        {#if !isVideoExporting}
          <i class="bi bi-camera-reels"></i>
        {:else}
          <i class="bi spinner"></i>
        {/if}
      </button>
    </div>
  </div>

  <div class="btn-group mb-1 d-flex" role="group">
    {#if hasTrackProfile}
      <button
        onclick={() => onAddTrackProfile()}
        class="btn btn-sm btn-outline-primary"
        style="flex: 1;">Track</button
      >
    {/if}
    {#if hasElevation}
      <button
        onclick={() => onAddElevationChart()}
        class="btn btn-sm btn-outline-primary"
        style="flex: 1;">Elevation</button
      >
    {/if}
    {#if hasHeartRate}
      <button
        onclick={() => onAddHeartrateChart()}
        class="btn btn-sm btn-outline-primary"
        style="flex: 1;">Heartrate</button
      >
    {/if}
    {#if hasSplitsData}
      <button
        onclick={() => onAddSplitsChart()}
        class="btn btn-sm btn-outline-primary"
        style="flex: 1;">Splits</button
      >
    {/if}
  </div>

  <div class="d-flex gap-1" style="flex-direction: row;">
    <div style="width: 100%; padding-top: 3px;">
      <S2PSliderDropdown
        bind:this={themeMainFontSlider}
        selectedValue={themeMainFont}
        dropdownData={Fonts.fontFamilies}
        onItemSelected={onFontFamilySelected}
      />
    </div>
  </div>

  {#if hasAnimations && !isVideoExporting}
    <S2PAnimationEditor
      bind:this={s2pAnimationEditor}
      startValue={maxAnimationDuration}
      {onStartAnimationRequested}
      {onAbortAnimationRequested}
      {onAnimationDurationChanged}
    />
  {/if}

  <div class="mb-2">
    {#if canvasItemSelected && !(canvasItemSelected instanceof S2PSvg)}
      <S2PVisualProps
        bind:this={polyProp}
        {canvasItemSelected}
        {currentSelection}
        {onRequestRedraw}
        onFieldMappingChanged={updateTextsValue}
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
          <div
            class="d-flex mb-2"
            style="justify-content: space-between; align-items: baseline;"
          >
            <label class="me-1 font-emp" for="defaultCheck1">
              Show text box guides
            </label>
            <input
              class="form-check-input"
              id="defaultCheck1"
              type="checkbox"
              onchange={s2pCanvas.onShowGuidesChanged}
            />
          </div>

          <div
            class="d-flex mb-2"
            style="justify-content: space-between; align-items: baseline;"
          >
            <div>
              <span class="me-1 font-emp">Export theme</span><i class="me-1"
                >The theme will be dumped in the browser console</i
              >
            </div>
            <button
              onclick={() => s2pCanvas.dump()}
              class="mb-2 btn btn-primary btn-sm">Export</button
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

  .spinner {
    width: 16px;
    height: 16px;
    border: 1px solid #ccc;
    border-top-color: #000;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
