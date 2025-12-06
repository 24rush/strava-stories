<script lang="ts">
  import { onMount } from "svelte";
  import S2PImage from "./components/S2PImage.svelte";

  let s2pImage: S2PImage;

  let data: any = {};
  let data_fetched = false;

  let strava_default_url = "https://www.strava.com/activities/15174937862";
  let url_ok: boolean = true;

  let themes: any = {};
  let theme_fetched = false;

  const regex = /^https?:\/\/(www\.)?strava\.com\/activities\/(\d+)(\/.*)?$/;
  const localActivities: Record<string, string> = {
    "15174937862": "15174937862.txt",
  };

  function getActivityIdFromUrl(url: string): string | undefined {
    const match = url.match(regex);
    return match ? match[2] : undefined;
  }

  async function getActivityFromLocalCache(
    stravaActUrl: string,
  ): Promise<string | undefined> {
    let activityId = getActivityIdFromUrl(stravaActUrl);

    if (activityId && activityId in localActivities) {
      const response = await fetch("data/" + localActivities[activityId]);
      const strava_data = await response.text();
      const match = strava_data.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
      );

      return match ? match[1] : "";
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
      data = jsonData.props.pageProps.activity;
      data_fetched = true;
      s2pImage.reloadTheme();

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
        data = strava_data["activity"];
        data_fetched = true;

        s2pImage.reloadTheme();
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

  onMount(() => {
    getThemes();
    getStravaActivity(strava_default_url);
  });

  function onStravaUrlChanged(e: any) {
    let activityId = getActivityIdFromUrl(e.target.value);
    url_ok = activityId != undefined;

    if (activityId) getStravaActivity(e.target.value);
  }
</script>

<main>
  <div
    class="container d-flex align-items-center"
    style="flex-direction: column; max-width: 500px;"
  >
    <h1
      class="mb-2"
      style="font-weight: 300;  font-size: clamp(2.5rem, 8vw, 6rem);"
    >
      strava stories
    </h1>

    <div class="mb-1 step-header">
      <span
        >Paste the URL of your Strava activity <i>(has to be set to Everyone)</i
        ></span
      >
    </div>

    <div class="row mb-2" style="width: 100%">
      <div
        class="col-md-4 mb-2 d-flex align-items-center"
        style="width: 100%; padding: 0px;"
      >
        <input
          style="width: 100%; margin-right: 1vw;"
          oninput={onStravaUrlChanged}
          placeholder={strava_default_url}
          value={strava_default_url}
        />
        {#if data_fetched}
          <i
            class="{url_ok ? 'url-ok-message' : 'url-error-message'} bi {url_ok
              ? 'bi-check-lg'
              : 'bi-exclamation-triangle'}"
          ></i>
        {:else}
          <i class="bi spinner"></i>
        {/if}
      </div>
    </div>

    <div class="mb-4" style="width: 100%;">
      {#if theme_fetched}
        <S2PImage {data} {themes} bind:this={s2pImage} />
      {/if}
    </div>

    <div class="d-flex justify-content-center">
      {#if theme_fetched}
        <button onclick={() => s2pImage.exportToPng()} class="btn btn-primary"
          >Export as PNG</button
        >
      {/if}
    </div>
  </div>
</main>

<style>
  .url-error-message {
    color: red;
  }

  .url-ok-message {
    color: green;
  }

  .spinner {
    width: 20px;
    height: 19px;
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
