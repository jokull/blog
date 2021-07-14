<script context="module">
	export const prerender = true;
	export async function load({ session }) {
		const posts = session.posts;
		return { props: { posts } };
	}
</script>

<script>
	export let posts;

	const formatDate = (value) => {
		const date = new Date(value);
		return new Intl.DateTimeFormat('is-IS', {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric'
		}).format(date);
	};
</script>

<svelte:head>
	<title>Nenad Kostic</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-4 sm:p-8">
	<div
		class="flex flex-col sm:flex-row justify-between items-center mb-12 md:my-16 lg:my-24 lg:mb-32"
	>
		<div class="order-1 sm:order-0 text-sm sm:text-base">
			<div>
				<p class="mb-4">
					Welcome to my site. 
				</p>
			</div>
			<div>
				<p class="mb-4">
					I am Javascript developer currently based in Calgary.
				</p>
			</div>
			<div>
				<p class="mb-4">
					I work with a group of wanderfull people on a fast growing video platform called Vidflex. <a href="https://www.vidflex.com/">Check it out.</a>
				</p>
			</div>
			<div>
				<p class="mb-4">
					In the past I have been working on a variaty of very interesting projects with Frontech Solutions from Edmonton Canada. <a href="https://www.frontech.ca/">Check it out.</a>
				</p>
			</div>
		</div>
		<div class="order-0 sm:order-1 mb-12 sm:mb-0 sm:ml-6 sm:flex-none text-center">
			<img alt="Profile bust" src="/profile.jpg" class="rounded-full w-48 h-48 bg-hardLime " />
		</div>
	</div>
	<div>
		{#each posts as post}
			<a
				href={`./blog/${post.slug}`}
				class="post block mb-4 pb-4 border-b border-gray-100 last:border-none last:mb-0"
			>
				<div class="title font-medium text-xl">{post.title}</div>
				<div class="date text-gray-400 font-light">{formatDate(post.date)}</div>
			</a>
		{/each}
	</div>
</div>
