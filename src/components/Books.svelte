<script>
	export let books;
</script>

<div
	class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:flex sm:justify-center gap-1 sm:gap-2 md:gap-4 mx-8"
>
	{#each books as book}
		<a href={`/books/${book.slug}`} class="lg:w-48">
			<img
				src={book.imageUrl}
				alt={`Cover for ${book.title}`}
				class="object-cover aspect-[10/16] w-full rounded-sm shadow-md block"
			/>
		</a>
	{/each}
</div>
