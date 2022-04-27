<script context="module">
	export async function load({ session }) {
		return { props: { posts: session.posts, books: session.books } };
	}
</script>

<script>
	import Books from '../components/Books.svelte';
	import Grouper from '../components/Grouper.svelte';
	export let posts;
	export let books;

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

<div class="absolute -top-36 ml-[50%] -left-[350px] scale-50 sm:scale-75 md:transform-none">
	<div class="absolute overflow-visible opacity-50 dark:opacity-20 top-0 left-4">
		<div class="mix-blend-multiply absolute w-[700px] h-[900px] rounded-[40rem] circle-a" />
	</div>
	<div class="absolute overflow-visible opacity-50 dark:opacity-20 top-28 left-52">
		<div class="mix-blend-multiply absolute w-[600px] h-[600px] rounded-[40rem] circle-b" />
	</div>
</div>

<div class="max-w-2xl mx-auto p-4 sm:p-8 relative">
	<!-- Two hazy circles playing -->
	<div
		class="flex flex-col sm:flex-row justify-between items-center mb-12 md:my-16 lg:my-24 lg:mb-32"
	>
		<div class="order-1 sm:order-0 text-sm sm:text-base">
			<div class="introduction">
				<p class="mb-3">
					Ég er vörustjóri hjá <a href="https://www.getsling.com">Sling</a> og vinn að nýrri vöru
					þar sem heitir
					<a href="https://www.tryinch.com/">Inch</a>. Ég hef starfað við ráðgjöf, meðal annars
					fyrir
					<a href="https://www.island.is/">Stafrænt Ísland</a>. Ég er stofnandi
					<a href="https://www.planitor.io/">Planitor</a> og
					<a href="https://takumi.com/">Takumi International ltd</a>. Þar á undan starfaði ég sem
					forritari og vörustjóri hjá
					<a href="https://quizup.com">QuizUp</a>.
				</p>
				<p>
					Ég hélt úti fréttabréfinu <a href="https://jokull.substack.com/">Reykjavík Mobility</a> þar
					sem fjallað er um samgöngur og skipulag í Reykjavík.
				</p>
			</div>
		</div>
		<div class="order-0 sm:order-1 mb-12 sm:mb-0 sm:ml-6 sm:flex-none text-center">
			<img
				alt="Profile bust"
				src="/profile.png"
				class="rounded-full w-48 h-48 bg-lime shadow-xl shadow-green-400"
			/>
		</div>
	</div>
</div>

<div class="max-w-2xl mx-auto p-4 sm:p-8 relative z-10">
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
					<div class="title font-medium text-xl font-Clash mb-1">{item.title}</div>
					<div class="date text-gray-400 font-light text-sm">{formatDate(item.date)}</div>
				</a>
			</div>
		</Grouper>
	</div>
</div>

<div class="border-y py-8 md:py-20 my-8">
	<div class="text-center text-3xl md:text-5xl font-bold font-Clash mb-4 sm:mb-8">Bækur</div>
	<Books {books} />
</div>
