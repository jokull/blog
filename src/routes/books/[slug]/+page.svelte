<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const { author, imageUrl, link, title, subtitle } = data.metadata!;

	let linkHost = new URL(link).host;
	if (linkHost.startsWith('www.')) {
		linkHost = linkHost.slice(4);
	}
</script>

<div
	class="prose grid !max-w-none grid-cols-[minmax(10px,1fr)_min(72ch,100%)_minmax(10px,1fr)] [&>*]:col-[2] [&>.full-bleed]:col-[1/4]"
>
	<div class="mb-4 flex items-center gap-6 py-8 sm:py-10 md:gap-16">
		<img src={imageUrl} alt="Book cover" class="inline w-32 rounded-sm shadow-lg" />
		<div class="flex-grow">
			<div class="mb-2">
				<div class="font-Clash text-2xl font-bold leading-[0.8] sm:text-3xl md:text-5xl">
					{title}
				</div>
				{#if subtitle}
					<div class="font-sm my-2 leading-tight text-gray-600 md:text-lg">{subtitle}</div>
				{/if}
			</div>
			<div class="mb-2 font-Clash">By {author}</div>
			<div class="text-xs uppercase"><a href={link} class="text-gray-500">{linkHost}</a></div>
		</div>
	</div>
	<svelte:component this={data.page} />
</div>
