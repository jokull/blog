<script lang="ts">
  import { onMount } from 'svelte';
  import sdk, { type EmbedOptions } from '@stackblitz/sdk';

  export let id: string;
  export let options : EmbedOptions;

  onMount(() => {
    sdk.embedProjectId(`embed-${id}`, id, options)
  })

</script>

<div class="full-bleed mb-8 h-[90vh]" id={`embed-${id}`} />
