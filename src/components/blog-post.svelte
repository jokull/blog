<script>
	import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
	import 'prismjs/plugins/command-line/prism-command-line.css';
	import 'prismjs/plugins/line-highlight/prism-line-highlight.css';
	import '$lib/prism-theme.css';

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

<div class="prose page max-w-none">
	<div class="py-8 sm:py-10 sm:text-center">
		<div class="font-bold text-4xl mb-4">{title}</div>
		<div class="text-sm">{dateDisplay}</div>
	</div>
	{#if image}
		<img src={`/blog/${image}`} class="full-bleed" alt="Banner" />
	{/if}
	<slot />
</div>
