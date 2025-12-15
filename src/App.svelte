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

  const appLinkRe = /^(https:\/\/)*strava\.app\.link\/[A-Za-z0-9]+$/;
  const regex = /^https?:\/\/(www\.)?strava\.com\/activities\/(\d+)(\/.*)?$/;
  const localActivities: Record<string, string> = {
    "15174937862": "15174937862.txt",
  };

  function isAppLinkUrl(url: string) {
    return url.match(appLinkRe) != null;
  }

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

    if (!isAppLinkUrl(stravaActUrl)) {
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
        reloadTheme();

        return;
      }
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

        reloadTheme();
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
    let url = e.target.value;
    url_ok = isAppLinkUrl(url) || getActivityIdFromUrl(url) != undefined;

    if (url_ok) getStravaActivity(url);
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
      strava_default_url = await navigator.clipboard.readText();
      onStravaUrlChanged({ target: { value: strava_default_url } });
    } catch (err) {
      console.error("Clipboard access denied", err);
    }
  }
</script>

<main>
  <div
    class="container d-flex align-items-center"
    style="flex-direction: column; max-width: 600px;"
  >
    <h1
      class="mb-2"
      style="font-weight: 300;  font-size: clamp(2.5rem, 8vw, 5rem);"
    >
      strava stories
    </h1>

    <div class="mb-1 step-header">
      <span
        >URL of your Strava activity (set to <i>Everyone</i
        >)</span
      >
    </div>

    <div class="row mb-2" style="width: 100%">
      <div
        class="col-md-4 d-flex align-items-center"
        style="width: 100%; padding: 0px;"
      >
        <button class="btn btn-primary me-1" onclick={pasteFromClipboard}>Paste</button>

        <input
          class="form-control {!url_ok ? 'is-invalid' : 'is-valid'}"
          style="width: 100%; margin-right: 3px;"
          oninput={onStravaUrlChanged}
          placeholder={strava_default_url}
          value={strava_default_url}
        />
        {#if !data_fetched}
          <i class="bi spinner"></i>
        {/if}
      </div>
    </div>

    <div class="mb-4" style="width: 100%;">
      {#if theme_fetched}
        <S2PImage {data} {themes} bind:this={s2pImage} />
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
