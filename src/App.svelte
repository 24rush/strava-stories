<script lang="ts">
  import { onMount } from "svelte";
  import S2PImage from "./components/S2PImage.svelte";
  import S2PFieldData from "./components/S2PFieldData.svelte";
  import { DataSource, FieldMappings } from "./lib/utils/fieldmappings";
  import S2PLogin from "./components/S2PLogin.svelte";

  let s2pImage: S2PImage;

  let s2pFieldData: S2PFieldData;
  let field_data_is_open = $state(false);
  
  let source: DataSource = new DataSource();
  let data_fetched = $state(false);

  let strava_default_url = "https://www.strava.com/activities/14134698093";
  let url_ok: boolean = true;

  let themes: any = {};
  let theme_fetched = $state(false);

  let loggedInAthlete: any = $state(false);

  const appLinkRegex = /[https:\/\/]*strava\.app\.link\/[A-Za-z0-9]+$/;
  const actRegex = /https?:\/\/[www\.]*strava\.com\/activities\/(\d+)(\/.*)?/;
  const localActivities: Record<string, string> = {
    "15174937862": "15174937862.txt",
    "14134698093": "14134698093.txt",
  };

  function extractStravaUrl(url: string): string | undefined {
    for (let regex of [actRegex, appLinkRegex]) {
      let match = url.match(regex);
      if (match) return match[0];
    }
  }

  async function getActivityFromLocalCache(
    stravaActUrl: string,
  ): Promise<string | undefined> {
    const match = stravaActUrl.match(actRegex);
    let activityId = match ? match[1] : undefined;

    if (activityId && activityId in localActivities) {
      const response = await fetch("data/" + localActivities[activityId]);
      const strava_data = await response.text();
      const dataMatch = strava_data.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
      );

      return dataMatch ? dataMatch[1] : "";
    }

    return undefined;
  }

  async function getStravaActivity(stravaActUrl: string) {
    data_fetched = false;

    const strava_data = await getActivityFromLocalCache(stravaActUrl);

    if (strava_data) {
      const jsonText = strava_data
        .trim()
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

      const jsonData = JSON.parse(jsonText);
      source.loadFromRaw(jsonData.props.pageProps.activity);
      
      s2pFieldData.refresh();
      data_fetched = true;
      reloadTheme();

      return;
    }

    await fetch("https://strava-stories-taupe.vercel.app/api/strava", {
      method: "GET",
      headers: {
        url: stravaActUrl,
      },
    })
      .then(async (res) => {
        url_ok = res.ok;
        data_fetched = true;

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw error.error;
        }
        return res.json();
      })
      .then((strava_data) => {
        let raw_data = strava_data["activity"];        
        url_ok = raw_data != null;
        data_fetched = true;

        if (url_ok) {
          source.loadFromRaw(raw_data);
          s2pFieldData.refresh();
          reloadTheme();
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        data_fetched = true;
      });
  }

  async function getThemes() {
    try {
      const response = await fetch("/themes.json");
      themes = await response.json();

      theme_fetched = true;
    } catch (err) {
      console.log(err);
    }
  }

  function onAthleteLoggedIn(loggedIn: boolean) {
    loggedInAthlete = loggedIn;
  }

  onMount(() => {
    getThemes();

    const url = new URL(window.location.href);
    const act = url.searchParams.get("act");

    if (act && act.match(/^\d*$/)) {
      strava_default_url = "https://www.strava.com/activities/" + act;
    }

    getStravaActivity(strava_default_url);    
  });

  function onStravaUrlChanged(e: any) {
    strava_default_url = e.target.value;

    let url = extractStravaUrl(e.target.value);
    url_ok = url != undefined;

    if (url_ok && url) {
      strava_default_url = url;
      getStravaActivity(url);
    }
  }

  function reloadTheme() {
    if (!s2pImage) {
      setTimeout(reloadTheme, 100);
    } else {
      s2pImage.reloadTheme();
    }
  }

  async function pasteFromClipboard() {
    try {
      onStravaUrlChanged({
        target: { value: await navigator.clipboard.readText() },
      });
    } catch (err) {
      console.error("Clipboard access denied", err);
    }
  }
</script>

<main>
  <div
    class="container tight-mobile d-flex align-items-center"
    style="flex-direction: column; max-width: 600px; justify-content: center"
  >
    <h1
      class="mb-3"
      style="font-weight: 300;  font-size: clamp(2.5rem, 8vw, 5rem);"
    >
      sweat story
    </h1>

    <S2PLogin {onAthleteLoggedIn} />

    <div class="row mb-2" style="width: 100%;">
      <div
        class="col-md-4 mb-1 d-flex gap-1 align-items-center"
        style="width: 100%; padding: 0px;justify-content: center; flex-direction: column;"
      >      
      {#if loggedInAthlete}
        <span class="mb-1">URL of your Strava activity (set to <i>Everyone</i>)</span>
        <div class="d-flex gap-1 align-items-center" style="width: 100%;">
          <button
            class="btn btn-primary"
            type="button"
            onclick={pasteFromClipboard}>Paste</button
          >
          <input
            class="form-control {!url_ok ? 'is-invalid' : 'is-valid'}"
            style="width: 100%; margin-right: 3px;"
            oninput={onStravaUrlChanged}
            placeholder={strava_default_url}
            value={strava_default_url}
          />
            {#if !data_fetched}              
              <i
              style="visibility: {data_fetched ? 'hidden' : 'visible'}"
              class="bi spinner"
              ></i>
            {/if}
        </div>
        {/if}
        
        <i>or</i>

        <button
          class="btn btn-sm btn-primary"
          class:active={field_data_is_open}
          data-bs-toggle="collapse"
          data-bs-target="#fieldData"
          aria-expanded={field_data_is_open}
          onclick={() => (field_data_is_open = !field_data_is_open)}
          aria-controls="fieldData"
          type="button">Manually enter values</button
        >
      </div>

      <S2PFieldData
        bind:this={s2pFieldData}
        id={"fieldData"}
        selectedField={FieldMappings.FieldNames[0] ?? ""}
        fieldMappings={FieldMappings.getFieldMapping()}
        getValueForField={(fieldName: string) => source.getValue(fieldName)}
        setValueForField={(fieldName: string, value: string | undefined) => {
            source.setValue(fieldName, value);
            s2pImage.updateTextsValue();
          }
        }        
      />
    </div>

    <div class="mb-4" style="width: 100%;">
      {#if theme_fetched}
        <S2PImage source={source} themes={themes} bind:this={s2pImage} />
      {/if}
    </div>
  </div>
</main>

<style>
  h1 {
    
    /* 1. Define the gradient */
    background: linear-gradient(to right, #fc5200, #000000d6);
    
    /* 2. Clip the background to the text */
    -webkit-background-clip: text;
    background-clip: text;
    
    /* 3. Make the actual text transparent so the background shows through */
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  .url-error-message {
    color: red;
  }

  .url-ok-message {
    color: green;
  }

  .spinner {
    width: 19px;
    height: 16px;
    border: 1px solid #ccc;
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
