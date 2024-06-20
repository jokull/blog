<script>
	export let url;
	export let caption = null;
	export let wider = false;
	export let fancy = false;
</script>

<div class={`${wider ? 'wider' : ''} relative mb-4`}>
	<img class={`${fancy && 'rounded-lg shadow-lg'} !my-2`} src={url} alt={caption || ''} />
	{#if caption}
		{#if fancy}
			<div
				class="
					absolute inset-x-4 bottom-2 rounded-lg bg-smooth px-4 pb-3 pt-6 text-center
					font-serif text-sm text-white
				"
			>
				{caption}
			</div>
		{:else}
			<div class="my-4 text-center font-serif text-sm">{caption}</div>
		{/if}
	{/if}
</div>
