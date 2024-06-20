<script lang="ts">
	import PostHeading from '../../components/PostHeading.svelte';
	import type { PageServerData } from './$types';

	export let data: PageServerData;
	let { date, title, image, locale } = data.metadata!;
</script>

<svelte:head>
	<title>{title} - Jökull Sólberg</title>
</svelte:head>
<div>
	<div
		class={[
			'prose',
			'max-w-none',
			'grid grid-cols-[minmax(10px,1fr)_min(72ch,90%)_minmax(10px,1fr)] [&>*]:col-[2] [&>.full-bleed]:col-[1/4]',
			'[&_p]:mb-4 [&_p]:sm:mb-6',
			'[&_a]:underline',
			'[&_h2]:mb-4 [&_h2]:font-Clash [&_h2]:text-2xl [&_h2]:font-medium',
			'[&_h3]:mb-4 [&_h3]:font-Clash [&_h3]:text-xl [&_h3]:font-medium',
			'[&_h4]:mb-4 [&_h4]:font-Clash [&_h4]:text-lg [&_h4]:font-medium',
			'[&_li]:mb-2 [&_li_p]:mb-0 [&_li_p]:inline',
			'[&_ul]:mb-4 [&_ul]:sm:mb-6 [&_ul_li]:ml-6 [&_ul_li]:list-disc [&_ul_li]:marker:text-lime',
			'[&_ol]:mb-4 [&_ol]:sm:mb-6 [&_ol_li]:list-inside [&_ol_li]:list-decimal',
			'[&>table]:col-[1/4] [&>table]:mx-auto [&>table]:max-w-[min(125ch,calc(100%-40px))] [&>table]:overflow-x-auto',
			'[&_pre]:col-[1/4] [&_pre]:mx-auto [&_pre]:mb-4 [&_pre]:w-full [&_pre]:overflow-x-auto [&_pre]:rounded-none [&_pre]:p-4 [&_pre]:text-xs [&_pre]:sm:max-w-[calc(100%-16px)]',
			'[&_pre]:sm:mb-6 [&_pre]:sm:w-auto [&_pre]:sm:rounded-lg',
			'[&_p_code]:font-medium',
			'[&_.wider]:col-[1/4] [&_.wider]:max-w-[calc(100%-16px)] [&_.wider]:overflow-x-auto',
			'[&_.full-bleed]:mx-auto [&_.full-bleed]:w-full',
			'[&_blockquote]:relative [&_blockquote]:ml-4 [&_blockquote]:pr-4 [&_blockquote]:font-mono [&_blockquote]:text-xs',
			'[&_blockquote]:before:absolute [&_blockquote]:before:-left-1.5 [&_blockquote]:before:h-full [&_blockquote]:before:w-0.5 [&_blockquote]:before:rounded [&_blockquote]:before:bg-slate-900',
			'[&_blockquote_footer]:font-medium',
			'[&_hr]:mx-4'
		].join(' ')}
	>
		<div class="full-bleed">
			{#if image}
				<div class="relative mb-16 sm:mb-24">
					<div class="absolute inset-0 bg-gradient-to-t from-black/70" />
					<div class="absolute inset-x-0 bottom-[10%] flex flex-col items-center justify-center">
						<PostHeading {date} {title} {locale} darkMode={true} />
					</div>
					<img
						src={`/blog/${image}`}
						class="max-h-[70vh] min-h-[80vh] w-full object-cover sm:min-h-0"
						alt="Banner"
					/>
				</div>
			{:else}
				<div class="py py-16 sm:py-24">
					<PostHeading {date} {title} {locale} />
				</div>
			{/if}
		</div>

		{@html data.page}
	</div>
</div>
