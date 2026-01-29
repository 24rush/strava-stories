<script lang="ts">
    import { onMount } from "svelte";
    import S2PRangeControl from "./S2PRangeControl.svelte";

    let {
        startValue,
        onStartAnimationRequested,
        onAbortAnimationRequested,
        onAnimationDurationChanged,
    }: {
        startValue: number;
        onStartAnimationRequested: () => void;
        onAbortAnimationRequested: () => void;
        onAnimationDurationChanged: (v: number) => void;
    } = $props();

    let animationRunning = $state(false);
    let animationStopTimeout: number = 0;

    onMount(() => {
        onPlayAnimation();
    });

    export function onNewLayout() {
        if (animationRunning) onAbortAnimationRequested();

        animationRunning = false;
        onPlayAnimation();
    }

    function onPlayAnimation() {
        if (animationRunning) onAbortAnimationRequested();
        else onStartAnimationRequested();

        animationRunning = !animationRunning;

        if (animationRunning) {
            clearTimeout(animationStopTimeout);
            animationStopTimeout = setTimeout(() => {
                animationRunning = !animationRunning;
            }, startValue);
        }
    }

    function onDurationChanged(v: number) {
        startValue = v;
        onAbortAnimationRequested();
        onAnimationDurationChanged(v);
        onStartAnimationRequested();

        animationRunning = true;
        clearTimeout(animationStopTimeout);
        animationStopTimeout = setTimeout(() => {
            animationRunning = false;
        }, startValue);
    }
</script>

<div class="d-flex" style="flex-direction: row;">
    <div class="d-flex mb-2" style="width: 50%; flex-direction: column; align-items: flex-end">
        <span class="font-emp">Duration</span>

        <S2PRangeControl
            value={startValue}
            step={500}
            min={0}
            max={Infinity}
            showValue={true}
            onValueChanged={onDurationChanged}
        />
    </div>
    <div class="d-flex" style="width: 50%; align-items: center; justify-content: flex-start; margin-top: 16px;">
        <button class="btn btn-primary btn ms-2" onclick={onPlayAnimation}>
            <i class="bi {animationRunning ? 'bi-pause' : 'bi-play'}"></i>
            {animationRunning ? "Stop" : "Play"}
        </button>
    </div>
</div>
