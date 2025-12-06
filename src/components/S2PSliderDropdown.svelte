<script lang="ts">
    let {
        dropdownData,
        selectedValue,
        onItemSelected,
    }: {
        dropdownData: Record<string, string[]>; // header, [values]
        selectedValue?: string;
        onItemSelected: (value: string) => void;
    } = $props();

    let countItems = $derived(
        Object.values(dropdownData).reduce((sum, arr) => sum + arr.length, 0),
    );
    let indexedValues: string[] = $derived(Object.values(dropdownData).flat());

    let currentItemIdx = $derived(
        (() => {            
            const idx = indexedValues.findIndex(
                (value) => value?.trim() == selectedValue?.trim()
            );
            
            return idx !== -1 ? idx : 0;
        })(),
    );

    let currentItem = $derived(indexedValues[currentItemIdx] ?? "");

    function selectItem(selectedValue: string) {
        currentItem = selectedValue;
        currentItemIdx = indexedValues.findIndex(
            (value) => value == selectedValue,
        );
        onItemSelected(selectedValue);
    }

    function prev() {
        currentItemIdx = (currentItemIdx - 1 + countItems) % countItems;
        selectItem(indexedValues[currentItemIdx] ?? "");
    }

    function next() {
        currentItemIdx = (currentItemIdx + 1) % countItems;
        selectItem(indexedValues[currentItemIdx] ?? "");
    }
</script>

<div class="d-flex justify-content-center mb-2" style="width: 100%;">
    <div
        class="btn-group d-flex align-items-center justify-content-center"
        style="width: 100%; max-width: 500px;"
        role="group"
    >
        <button class="btn btn-primary btn-sm" style="flex: 2;" onclick={prev}>
            <i class="bi bi-chevron-left"></i>
        </button>

        <div class="dropdown-center" style="flex: 16;">
            <button
                class="btn btn-outline-secondary btn-sm dropdown-toggle"
                style="border-radius: 0px; width: 100%;"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {currentItem}
            </button>

            <ul class="dropdown-menu">
                {#each Object.entries(dropdownData) as [header, values]}
                    <li><h6 class="dropdown-header">{header}</h6></li>
                    {#each values as currItem}
                        <li>
                            <button
                                class="dropdown-item"
                                onclick={() => selectItem(currItem)}
                                >{currItem}</button
                            >
                        </li>
                    {/each}
                {/each}
            </ul>
        </div>

        <button class="btn btn-primary btn-sm" style="flex: 2;" onclick={next}>
            <i class="bi bi-chevron-right"></i>
        </button>
    </div>
</div>
