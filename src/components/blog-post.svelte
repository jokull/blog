<script>
	import '$lib/prism-theme.postcss';

	export let title;
	export let date;
	export let image;

	let dateDisplay = new Date(Date.parse(date)).toLocaleDateString('is-IS', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>

<div class="prose prose-sm sm:prose page max-w-none sm:max-w-none">
	<div class="py-8 sm:py-10 sm:text-center">
		<div class="leading-relaxed text-4xl mb-4 font-Outfit font-medium">{title}</div>
		<div class="text-sm font-Outfit">{dateDisplay}</div>
	</div>
	{#if image}
		<img src={`/blog/${image}`} class="full-bleed" alt="Banner" />
	{/if}
	<slot />
</div>
