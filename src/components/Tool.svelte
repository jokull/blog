<script>
	export let url = undefined;
	export let name;
</script>

<div class="mb-8 flex items-start">
	{#if url}
		<a href={url} class="flex-grow-0 mt-1" target="_blank"><slot /></a>
	{:else}
		<div class="flex-grow-0 mt-1"><slot /></div>
	{/if}
	<div class="ml-4 leading-snug">
		<a href={url} class="text-lg font-semibold" target="_blank">{name}</a>
		<slot name="description" />
	</div>
</div>
