<script context="module">
	export const prerender = true;
	export async function load({ session }) {
		const posts = session.posts;
		return { props: { posts } };
	}
</script>

<script>
	import Grouper from '../components/Grouper.svelte';
	export let posts;

	const formatDate = (value) => {
		const date = new Date(value);
		return new Intl.DateTimeFormat('is-IS', {
			year: undefined,
			month: 'long',
			day: 'numeric'
		}).format(date);
	};

	const getYearFromPost = (post) => {
		return post.parsedDate.getFullYear();
	};
</script>

<svelte:head>
	<title>Jökull Sólberg</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-4 sm:p-8">
	<div
		class="flex flex-col sm:flex-row justify-between items-center mb-12 md:my-16 lg:my-24 lg:mb-32"
	>
		<div class="order-1 sm:order-0 text-sm sm:text-base">
			<div>
				<p class="mb-2">
					Ég er vörustjóri hjá <a class="font-bold" href="https://www.getsling.com">Sling</a> og
					vinn að nýrri vöru þar sem heitir
					<a
						class="font-bold"
						href="https://www.craft.do/s/0ZbFxiNPQ7j79d?fbclid=IwAR2hWTdZrhfE8iOPU33OcgyWDbky9-16XUJbBZGS67hLHS0JZuMfVO_s6JM"
						>Inch</a
					>. Ég hef starfað við ráðgjöf, meðal annars fyrir
					<a class="font-bold" href="https://www.island.is/">Stafrænt Ísland</a>. Ég er stofnandi
					<a class="font-bold" href="https://www.planitor.io/">Planitor</a> og
					<a class="font-bold" href="https://takumi.com/">Takumi International ltd</a>. Þar á undan
					starfaði ég sem forritari og vörustjóri hjá
					<a class="font-bold" href="https://quizup.com">QuizUp</a>.
				</p>
				<p>
					Ég hélt úti fréttabréfinu <a class="font-bold" href="https://jokull.substack.com/"
						>Reykjavík Mobility</a
					> þar sem fjallað er um samgöngur og skipulag í Reykjavík.
				</p>
			</div>
		</div>
		<div class="order-0 sm:order-1 mb-12 sm:mb-0 sm:ml-6 sm:flex-none text-center">
			<img alt="Profile bust" src="/profile.png" class="rounded-full w-48 h-48 bg-lime " />
		</div>
	</div>
	<div>
		<Grouper items={posts} groupForItem={getYearFromPost} let:group let:item>
			<div slot="group" class="my-6 first:mt-0">
				<div class="text-xs text-gray-500">{group}</div>
			</div>
			<div slot="item">
				<a
					href={`./${item.slug}`}
					class="item block mb-4 pb-4 border-b border-gray-100 last:border-none last:mb-0"
				>
					<div class="title font-medium text-xl font-Outfit mb-1">{item.title}</div>
					<div class="date text-gray-400 font-light text-sm">{formatDate(item.date)}</div>
				</a>
			</div>
		</Grouper>
	</div>
</div>
