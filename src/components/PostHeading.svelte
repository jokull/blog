<script>
	export let title;
	export let date;
	export let locale = 'en-US';
	export let darkMode = false;

	let dateDisplay = date
		? new Date(Date.parse(date)).toLocaleDateString(locale, { dateStyle: 'long' })
		: null;
</script>

<div class="text-center">
	<div
		class={`leading-tight sm:leading-normal text-4xl xl:text-5xl font-Clash font-medium px-4 max-w-5xl mx-auto ${
			darkMode && 'text-white'
		}`}
	>
		{title}
	</div>
	{#if date}
		<div class="my-8">
			<span
				class={`${
					darkMode ? 'text-white border-white' : 'text-lime border-lime'
				} font-semibold px-4 py-1.5 relative text-md border-t-2`}
			>
				{dateDisplay}
			</span>
		</div>
	{/if}
</div>
