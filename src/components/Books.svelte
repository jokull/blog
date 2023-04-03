<script lang="ts">
	import { page } from '$app/stores';
	import type { bookSchema } from '$lib/schemas';
	import type { z } from 'zod';
	$: slug = $page.url?.pathname.split('/').at(-1);
	export let books: z.infer<typeof bookSchema>[] = [];
</script>

<div
	class="mx-auto grid max-w-6xl grid-cols-3 gap-2 px-4 sm:grid-cols-4 sm:justify-center md:grid-cols-5 md:gap-4 lg:grid-cols-8"
>
	{#each books as book}
		<a
			href={`/books/${book.slug}`}
			class={`${slug === book.slug ? '-translate-y-1 scale-[1.11]' : ''}`}
		>
			<img
				src={book.imageUrl}
				alt={`Cover for ${book.title}`}
				class="block aspect-[10/16] w-full object-cover shadow-lg"
			/>
		</a>
	{/each}
</div>
