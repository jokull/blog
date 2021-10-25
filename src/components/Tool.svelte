<script>
	export let url;
	export let name;
</script>

<div class="mb-8 flex items-start">
	<a href={url} class="flex-grow-0 mt-1"><slot /></a>
	<div class="ml-4 leading-snug">
		<a href={url} class="text-lg font-semibold">{name}</a>
		<slot name="description" />
	</div>
</div>
