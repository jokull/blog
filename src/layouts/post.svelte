<script>
	import '$lib/prism-theme.postcss';

	export let title;
	export let date;
	export let image = null;
	export let locale = 'en-US';

	let dateDisplay = date
		? new Date(Date.parse(date)).toLocaleDateString(locale, { dateStyle: 'long' })
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
			<div class="my-8">
				<span class="text-lime font-semibold px-4 py-1.5 relative text-md border-t-2 border-lime">
					{dateDisplay}
				</span>
			</div>
		{/if}
	</div>
	{#if image}
		<img src={`/blog/${image}`} class="full-bleed mb-4 sm:mb-8" alt="Banner" />
	{/if}
	<div class="prose max-w-none">
		<slot />
	</div>
</div>
