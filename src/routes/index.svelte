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

<div class="max-w-2xl mx-auto p-4 sm:p-8">
	<div
		class="flex flex-col sm:flex-row justify-between items-center mb-12 md:my-16 lg:my-24 lg:mb-32"
	>
		<div class="order-1 sm:order-0">
			<div>
				<p class="mb-2">
					Ég starfa sem sjálfstæður ráðgjafi og er einn af stofnendum <a
						class="font-bold"
						href="https://www.planitor.io/">Planitor</a
					>. Ég er stofnandi
					<a class="font-bold" href="https://takumi.com/">Takumi International ltd.</a>
					ásamt öðrum og þar á undan starfaði ég sem forritari og vörustjóri hjá
					<a class="font-bold" href="https://quizup.com">QuizUp</a>.
				</p>
				<p>
					Ég held úti fréttabréfinu <a class="font-bold" href="https://jokull.substack.com/"
						>Reykjavík Mobility</a
					> þar sem fjallað er um samgöngur og skipulag í Reykjavík.
				</p>
			</div>
		</div>
		<div class="order-0 sm:order-1 mb-4 sm:mb-0 sm:ml-6 sm:flex-none text-center">
			<img
				alt="Profile bust"
				src="/profile.jpg"
				class="rounded-full w-48 h-48 border-4 border-lime"
			/>
		</div>
	</div>
	<div>
		{#each posts as post}
			<a href={`./${post.slug}`} class="block mb-4 pb-4 border-b border-gray-100">
				<div class="font-medium text-xl">{post.title}</div>
				<div class="text-gray-400 font-light">{formatDate(post.date)}</div>
			</a>
		{/each}
	</div>
</div>
