<script>
	import '$lib/prism-theme.postcss';

	export let title;
	export let date;
	export let image = null;

	let dateDisplay = date
		? new Date(Date.parse(date)).toLocaleDateString('is-IS', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
		  })
		: null;
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>

<div class="page max-w-none sm:max-w-none">
	<div class="py-8 sm:py-10 sm:text-center">
		<div class="leading-relaxed text-4xl font-Clash font-medium">{title}</div>
		{#if date}
			<div class="text-sm font-Clash mt-4">{dateDisplay}</div>
		{/if}
	</div>
	{#if image}
		<img src={`/blog/${image}`} class="full-bleed mb-4 sm:mb-8" alt="Banner" />
	{/if}
	<div class="prose max-w-none">
		<slot />
	</div>
</div>
