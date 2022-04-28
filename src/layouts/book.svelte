<script>
	export let title;
	export let subtitle;
	export let author;
	export let link;
	export let imageUrl;

	let linkHost = new URL(link).host;
	if (linkHost.startsWith('www.')) {
		linkHost = linkHost.slice(4);
	}
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>

<div class="page max-w-none sm:max-w-none">
	<div class="py-8 sm:py-10 flex gap-6 md:gap-16 items-center mb-4">
		<img src={imageUrl} alt="Book cover" class="shadow-lg w-32 rounded-sm inline" />
		<div class="flex-grow">
			<div class="mb-2">
				<div class="leading-[0.8] text-2xl sm:text-3xl md:text-5xl font-Clash font-bold">
					{title}
				</div>
				{#if subtitle}
					<div class="font-sm md:text-lg text-gray-600 my-2 leading-tight">{subtitle}</div>
				{/if}
			</div>
			<div class="font-Clash mb-2">By {author}</div>
			<div class="text-xs uppercase"><a href={link} class="text-gray-500">{linkHost}</a></div>
		</div>
	</div>
	<div class="prose max-w-none">
		<slot />
	</div>
</div>
