<script lang="ts">
    import { onMount } from "svelte";
    import S2PSliderDropdown from "./S2PSliderDropdown.svelte";

    let {
        id,
        fieldMappings,
        selectedField,
        getValueForField,
        setValueForField,
    }: {
        id: string;
        fieldMappings: Record<string, string[]>;
        selectedField: string;

        getValueForField: (fieldName: string) => string | undefined;
        setValueForField: (fieldName: string, value: string) => void;
    } = $props();
    
    let field_value = $state("");

    onMount(() => {
        onFieldValueSelected("", selectedField);
    });

    export function refresh() {
        onFieldValueSelected("", selectedField);
    }

    function onFieldValueSelected(type: string, fieldName: string) {
        selectedField = fieldName;
        field_value = getValueForField(fieldName) ?? "";
    }

    function onInputFieldData() {
        setValueForField(selectedField, field_value);
    }
</script>

<div class="collapse mt-3" id="{id}" style="width: 100%;">
    <S2PSliderDropdown        
        dropdownData={fieldMappings}
        onItemSelected={onFieldValueSelected}
    />
    <input
        class="form-control"
        bind:value={field_value}
        oninput={onInputFieldData}
    />
</div>
