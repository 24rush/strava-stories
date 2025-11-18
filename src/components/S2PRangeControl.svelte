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
    <button class="btn btn-outline-primary btn-sm" onclick={decrement}>−</button>
    <input style="width: 55px; height: 32px;"
        type="number"
        class="form-control text-center"
        value="{value}"
        oninput="{e => onValueChanged(parseInt(e.currentTarget.value))}"
        {min}
        {max}
        {step}
    />
    <button class="btn btn-outline-primary btn-sm" onclick={increment}>+</button>
</div>
