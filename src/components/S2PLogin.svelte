<script lang="ts">
    import { onMount } from "svelte";

    let {
        onAthleteLoggedIn,
    }: {
        onAthleteLoggedIn(loggedInAthlete: boolean): void;
    } = $props();

    let STRAVA_AUTH_URL = "https://strava-auth.vercel.app";
    const STORAGE_KEY_AUTH = "auth";
    const STORAGE_KEY_LOGIN_IN_PROGRESS = "op";
    const CLOCK_SKEW_BUFFER = 30; // seconds

    let loggedInAthlete = $state(false);
    let operation_inprogress = $state(false);
    let operation_msg = $state("");

    onMount(() => {
        if (isLocalhost()) {
            STRAVA_AUTH_URL = "http://localhost:3000";
        }

        getLoggedInUser();
    });

    function isLocalhost() {
        return /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(
            window.location.hostname,
        );
    }

    async function logout() {
        loggedInAthlete = false;
        onAthleteLoggedIn(loggedInAthlete);
        localStorage.removeItem(STORAGE_KEY_AUTH);

        setOperation(true, "Logging you out...");

        await fetch(STRAVA_AUTH_URL + "/api/logout", {
            method: "POST",
            credentials: "include",
        });

        setOperation(false, "");
    }

    async function login() {
        localStorage.setItem(STORAGE_KEY_LOGIN_IN_PROGRESS, "y");
        setOperation(true, "Logging you in...");
        window.location.href = STRAVA_AUTH_URL + "/api/login?site=sweatstory";
    }

    function isLoginInProgress(): boolean {
        let storage = localStorage.getItem(STORAGE_KEY_LOGIN_IN_PROGRESS);
        if (!storage) return false;

        return storage == "y";
    }

    async function getLoggedInUser() {
        try {
            setOperation(true, "Retrieving user info...");

            let auth = null;
            let storage = localStorage.getItem(STORAGE_KEY_AUTH);
            if (storage) auth = JSON.parse(storage);

            if (!auth && isLoginInProgress()) {
                // Check if session was just authenticated
                const res = await fetch(STRAVA_AUTH_URL + "/api/me", {
                    method: "POST",
                    credentials: "include",
                });

                if (res.ok) {
                    auth = await res.json();

                    localStorage.setItem(
                        STORAGE_KEY_AUTH,
                        JSON.stringify({
                            expiresAt: auth.expiresAt,
                        }),
                    );
                    localStorage.removeItem(STORAGE_KEY_LOGIN_IN_PROGRESS);
                } else {
                    throw "Not authenticated";
                }
            }

            const now = Math.floor(Date.now() / 1000);

            loggedInAthlete =
                auth && auth.expiresAt > now + CLOCK_SKEW_BUFFER ? true : false;

            // loggedInAthlete = {
            //   "id": 200976954,
            //   "username": null,
            //   "resource_state": 2,
            //   "firstname": "Alin",
            //   "lastname": "Iordache",
            //   "bio": null,
            //   "city": "Cluj-Napoca",
            //   "state": "Județul Cluj",
            //   "country": "Romania",
            //   "sex": "M",
            //   "premium": false,
            //   "summit": false,
            //   "created_at": "2026-01-13T12:06:19Z",
            //   "updated_at": "2026-01-13T13:01:35Z",
            //   "badge_type_id": 0,
            //   "weight": null,
            //   "profile_medium": "avatar/athlete/medium.png",
            //   "profile": "avatar/athlete/large.png",
            //   "friend": null,
            //   "follower": null
            // };
        } catch (err) {
            console.error("Auth check failed", err);
            loggedInAthlete = false;
        }

        setOperation(false, "");
        onAthleteLoggedIn(loggedInAthlete);
    }

    function setOperation(progress: boolean, message: string) {
        operation_inprogress = progress;
        operation_msg = message;
    }
</script>

{#if operation_inprogress}
    <div class="d-flex" style="flex-direction: row; align-items:center;">
        <i
            style="visibility: {operation_inprogress ? 'visible' : 'visible'}"
            class="bi spinner me-2"
        ></i>
        <span>{operation_msg}</span>
    </div>
{:else if !loggedInAthlete}
    <button class="icon-btn" aria-label="Action" on:click={login}>
        <img src="/svgs/btn_strava_connect_with_orange.svg" alt="" />
    </button>
{:else}
    <button
        class="btn btn-sm btn-primary logout-btn"
        type="button"
        on:click={logout}
        aria-label="Log out"
    >
        <span>Logout</span>
    </button>
{/if}

<style>
    .icon-btn {
        all: unset; /* removes borders, background, focus styles */
        cursor: pointer;
        display: inline-flex;
    }

    .icon-btn img {
        display: block;
    }

    .icon-btn:focus-visible {
        outline: 2px solid #5b9cff; /* optional, accessible focus */
        outline-offset: 2px;
    }

    .logout-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        cursor: pointer;
        display: inline-flex;
    }

    .spinner {
        width: 32px;
        height: 32px;
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
