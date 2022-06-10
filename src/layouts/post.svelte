<script>
	import '$lib/prism-theme.postcss';
	import PostHeading from '../components/PostHeading.svelte';

	export let title;
	export let date;
	export let image = null;
	export let locale = 'en-US';
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>

<div class="page">
	<div class="full-bleed">
		{#if image}
			<div class="relative mb-16 sm:mb-24">
				<div class="absolute inset-0 bg-gradient-to-t from-black/70" />
				<div class="flex flex-col items-center justify-center absolute inset-x-0 bottom-[10%]">
					<PostHeading {date} {locale} {title} darkMode={true} />
				</div>
				<img src={`/blog/${image}`} class="w-full max-h-[70vh] object-cover" alt="Banner" />
			</div>
		{:else}
			<div class="py-16 sm:py-24 py">
				<PostHeading {date} {locale} {title} />
			</div>
		{/if}
	</div>
	<div class="prose max-w-none">
		<slot />
	</div>
</div>
