<script lang="ts">
	export let title: string;
	export let date: Date;
	export let locale = 'en-US';
	export let darkMode = false;

	let dateDisplay = date ? new Date(date).toLocaleDateString(locale, { dateStyle: 'long' }) : null;
</script>

<div class="text-center">
	<div
		class={`mx-auto max-w-5xl px-4 font-Clash text-3xl font-medium sm:text-4xl xl:text-5xl ${
			darkMode && 'text-white'
		}`}
	>
		{title}
	</div>
	{#if date}
		<div class="my-8">
			<span
				class={`${
					darkMode ? 'border-white text-white' : 'border-lime text-lime'
				} text-md relative border-t-2 px-4 py-1.5 font-semibold`}
			>
				{dateDisplay}
			</span>
		</div>
	{/if}
</div>
