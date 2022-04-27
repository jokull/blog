<script>
	export let url;
	export let caption = null;
	export let wider = false;
	export let fancy = false;
</script>

<div class={`${wider ? 'wider' : ''} mb-4 relative`}>
	<img class={`${fancy && 'shadow-lg rounded-lg'} !my-2`} src={url} alt={caption || ''} />
	{#if caption}
		{#if fancy}
			<div
				class="
					text-sm font-Clash text-center pb-3 pt-6 px-4 font-medium text-white absolute
					bg-smooth rounded-lg inset-x-4 bottom-2
				"
			>
				{caption}
			</div>
		{:else}
			<div class="text-sm font-Clash text-center my-4">{caption}</div>
		{/if}
	{/if}
</div>
