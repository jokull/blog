<script lang="ts">
	import { groupBy } from 'remeda';
	import Books from '../components/Books.svelte';
	import type { PageServerData } from './$types';
	export let data: PageServerData;

	const groupedPosts = Object.entries(
		groupBy(data.posts, (post) => post.date.getFullYear())
	).reverse();
</script>

<svelte:head>
	<title>Jökull Sólberg</title>
</svelte:head>

<div
	class="absolute -left-[200px] -top-56 ml-[50%] scale-50 sm:scale-75 md:-left-[350px] md:scale-[0.85] lg:scale-125"
>
	<div class="absolute left-4 top-0 overflow-visible opacity-40 dark:opacity-20">
		<div class="circle-a absolute h-[900px] w-[700px] rounded-[40rem] mix-blend-multiply" />
	</div>
	<div class="absolute right-0 top-28 overflow-visible opacity-40 lg:top-0 dark:opacity-20">
		<div class="circle-b absolute h-[600px] w-[600px] rounded-[40rem] mix-blend-multiply" />
	</div>
</div>

<div class="relative mx-auto max-w-2xl p-4 sm:p-8">
	<!-- Two hazy circles playing -->
	<div
		class="mb-12 flex flex-col items-center justify-between sm:flex-row md:my-16 lg:my-24 lg:mb-32"
	>
		<div class="sm:order-0 order-1 text-sm sm:text-base">
			<div class="[&_a]:font-medium [&_a]:underline [&_a]:hover:text-black">
				<p>
					I'm Jökull Sólberg, co-founder and CTO of <a
						href="https://www.triptojapan.com/"
						target="_blank">Trip To Japan</a
					>, a startup creating the best booking experience for the Japan inbound tourism market.
					Previously I founded one of the first influencer marketing platforms
					<a href="https://www.takumi.com/" target="_blank">Takumi</a>. I've managed products and
					development teams for
					<a href="https://www.quizup.com" target="_blank">QuizUp</a> (Seqouia VC funded) and
					<a href="https://www.getsling.com" target="_blank">Sling</a>
					(acquired by <a href="https://www.toasttab.com" target="_blank">Toast Inc.</a>).
				</p>
			</div>
		</div>
		<div class="order-0 mb-12 text-center sm:order-1 sm:mb-0 sm:ml-6 sm:flex-none">
			<img
				alt="Profile bust"
				src="/baldur-square.jpg"
				class="h-48 w-48 rounded-full bg-lime shadow-lg lg:h-52 lg:w-52"
			/>
		</div>
	</div>
</div>

<div class="relative z-10 mx-auto max-w-2xl p-4 sm:p-8">
	<div>
		{#each groupedPosts as [year, posts]}
			<div class="my-6 first:mt-0">
				<div class="font-serif text-lg">{year}</div>
			</div>

			<div class="flex flex-col gap-3 sm:gap-1">
				{#each posts as post}
					<a
						href={`./${post.slug}`}
						class="item group flex-col gap-1 pb-4 leading-tight hover:no-underline sm:flex sm:flex-row sm:items-start sm:justify-between sm:leading-normal"
					>
						<div
							class="title w-4/5 font-medium decoration-auto group-hover:underline group-hover:decoration-black/30"
						>
							{post.title}
						</div>
						<div
							class="date text-sm font-light text-gray-600 group-hover:no-underline sm:text-base"
						>
							{post.date.toLocaleDateString(undefined, {
								year: undefined,
								month: 'long',
								day: 'numeric'
							})}
						</div>
					</a>
				{/each}
			</div>
		{/each}
	</div>
</div>

<div class="my-8 py-8 md:py-12">
	<div class="mb-4 text-center font-serif text-3xl sm:mb-8 md:text-5xl">Bækur</div>
	<Books books={data.books} />
</div>
