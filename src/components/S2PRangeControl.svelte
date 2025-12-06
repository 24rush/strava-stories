<script lang="ts">
    let {
        value,
        min,
        max,
        step,
        onValueChanged,
    }: {
        value: number;
        min: number;
        max: number;
        step: number;
        onValueChanged: (v: number) => void;
    } = $props();

    function increment() {
        if (value + step <= max) value += step;
        onValueChanged(value);
    }

    function decrement() {
        if (value - step >= min) value -= step;
        onValueChanged(value);
    }
</script>

<div class="input-group" style="max-width: 200px; flex-wrap: nowrap;">
    <button class="btn btn-outline-primary" onclick={decrement}>−</button
    >
    <input
        style="width: 55px; height: 32px; display: none;"
        type="number"
        class="form-control text-center"
        {value}
        oninput={(e) => onValueChanged(parseInt(e.currentTarget.value))}
        {min}
        {max}
        {step}
    />
    <button class="btn btn-outline-primary" onclick={increment}>+</button
    >
</div>

<style>
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        /* display: none; <- Crashes Chrome on hover */
        -webkit-appearance: none;
        margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
    }

    input[type="number"] {
        -moz-appearance: textfield; /* Firefox */
    }
</style>
