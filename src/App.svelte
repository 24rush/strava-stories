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

  function getActivityIdFromUrl(url: string): string | undefined {
    const match = url.match(regex);
    return match ? match[2] : undefined;
  }

  async function getStravaActivity(stravaActUrl: string) {
    await fetch("https://strava-stories-taupe.vercel.app/api/strava", {
      method: "GET",
      headers: {
        url: stravaActUrl,
      },
    })
      .then(async (res) => {
        url_ok = res.ok;

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          //message: error.error || "Unknown error",
          throw error.error;
        }
        return res.json();
      })
      .then((strava_data) => {
        data = strava_data["activity"];
        data_fetched = true;

        s2pImage.reloadTheme();
      })
      .catch((err) => console.error("Fetch error:", err));
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
  <div class="container">
    <h1
      class="mb-1"
      style="font-weight: 300;  font-size: clamp(2.5rem, 8vw, 6rem); margin: 0;"
    >
      strava stories
    </h1>

    <div class="mb-1 step-header">
      <span
        ><b class="">Step 1:&nbsp;</b>Paste the URL of your Strava activity (has
        to be set to Everyone)</span
      >
    </div>

    <div class="row mb-2">
      <div
        class="col-md-4 mb-2 d-flex align-items-center gap-1"
        style="width: 100%"
      >
        <input
          style="width: 100%"
          oninput={onStravaUrlChanged}
          placeholder={strava_default_url}
          value={strava_default_url}
        />
        <i
          class="{url_ok ? 'url-ok-message' : 'url-error-message'} bi {url_ok
            ? 'bi-check-lg'
            : 'bi-exclamation-triangle'}"
        ></i>
      </div>
    </div>
    <div class="mb-2 step-header">
      <span
        ><b class="">Step 2:&nbsp;</b>Choose a theme and customize the data
        fields</span
      >
    </div>

    <div class="mb-4" style="margin: auto;">
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
</style>
