<script>
	export let url;
	export let caption = null;
	export let wider = false;
</script>

<div class={`${wider ? 'wider' : ''} mb-4`}>
	<img class="!my-2 shadow-lg rounded-lg" src={url} alt={caption || ''} />
	{#if caption}
		<div class="text-sm text-center my-4 font-medium text-gray-500">{caption}</div>
	{/if}
</div>
