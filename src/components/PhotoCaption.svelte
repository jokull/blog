<script>
	export let url;
	export let caption;
	export let wider = false;
</script>

<div class={`${wider ? 'wider' : ''} mb-4`}>
	<img class="!mb-2" src={url} alt={caption} />
	<div class="text-sm text-center">{caption}</div>
</div>
