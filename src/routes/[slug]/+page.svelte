<script lang="ts">
	import PostHeading from '../../components/PostHeading.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	let { date, title, image, locale } = data.metadata!;
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>
<div>
	<div
		class="prose grid !max-w-none grid-cols-[minmax(10px,1fr)_min(72ch,90%)_minmax(10px,1fr)] [&>*]:col-[2] [&>.full-bleed]:col-[1/4]"
	>
		<div class="full-bleed">
			{#if image}
				<div class="relative mb-16 sm:mb-24">
					<div class="absolute inset-0 bg-gradient-to-t from-black/70" />
					<div class="absolute inset-x-0 bottom-[10%] flex flex-col items-center justify-center">
						<PostHeading {date} {title} {locale} darkMode={true} />
					</div>
					<img
						src={`/blog/${image}`}
						class="max-h-[70vh] min-h-[80vh] w-full object-cover sm:min-h-0"
						alt="Banner"
					/>
				</div>
			{:else}
				<div class="py py-16 sm:py-24">
					<PostHeading {date} {title} {locale} />
				</div>
			{/if}
		</div>

		<svelte:component this={data.page} />
	</div>
</div>
