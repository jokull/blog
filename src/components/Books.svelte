<script>
	export let books;
	export let current = null;
</script>

<div
	class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:flex sm:justify-center gap-2 md:gap-4 mx-8"
>
	{#each books as book}
		<a
			href={`/books/${book.slug}`}
			class={`lg:w-48 ${current === book.slug ? 'scale-[1.08] -translate-y-1' : ''}`}
		>
			<img
				src={book.imageUrl}
				alt={`Cover for ${book.title}`}
				class={`object-cover aspect-[10/16] w-full shadow-lg block ${
					current === book.slug ? 'border-white border-2 rounded-sm' : 'rounded-sm'
				}`}
			/>
		</a>
	{/each}
</div>
