<script>
	import '$lib/prism-theme.postcss';

	export let title;
	export let date;
	export let image = null;

	let dateDisplay = date
		? new Date(Date.parse(date)).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
		  })
		: null;
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>

<div class="page">
	<div class="my-8 sm:my-10 text-center full-bleed">
		<div class="leading-tight sm:leading-normal text-4xl font-Clash font-medium px-4">
			{title}
		</div>
		{#if date}
			<div class="text-sm my-4">{dateDisplay}</div>
		{/if}
	</div>
	{#if image}
		<img src={`/blog/${image}`} class="full-bleed mb-4 sm:mb-8" alt="Banner" />
	{/if}
	<div class="prose max-w-none">
		<slot />
	</div>
</div>
