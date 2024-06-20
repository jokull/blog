<script lang="ts">
	export let title: string;
	export let date: Date;
	export let locale = 'en-US';

	let dateDisplay = date ? new Date(date).toLocaleDateString(locale, { dateStyle: 'long' }) : null;
</script>

<div class="text-center">
	<div class="mx-auto max-w-5xl text-balance px-4 font-serif text-3xl sm:text-4xl xl:text-5xl">
		{title}
	</div>
	{#if date}
		<div class="my-8">
			<span class="text-md relative border-t-2 border-lime px-4 py-1.5 font-serif">
				{dateDisplay}
			</span>
		</div>
	{/if}
</div>
