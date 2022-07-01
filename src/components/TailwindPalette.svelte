<script lang="ts">
	import { onMount } from 'svelte';
	import postcss from 'postcss';
	import postcssOKLabFunction from '@csstools/postcss-oklab-function';

	function getStyles(chroma: number, hue: number) {
		const variables = [...PALETTE.entries()].map(
			([step, lightness]) => `--primary-${step}: oklch(${lightness} ${chroma / 1000} ${hue})`
		);

		let css = postcss([
			postcssOKLabFunction({
				enableProgressiveCustomProperties: true,
				preserve: true,
				subFeatures: {
					displayP3: false
				}
			})
		]).process(`:root { ${variables.join(';') + ';'}}`).css;

		// Now create the safe palette used to overlay a comparison "triangle" inside each cell
		const safe = postcss([
			postcssOKLabFunction({
				preserve: false
			})
		])
			.process(variables.join(';') + ';')
			.css.split(';')
			.map((s) => s.replace('--primary', '--primary-safe'));

		return `${css} :root { ${safe.join(';')}; }`;
	}

	const PALETTE = new Map<number, string>([
		[50, '97%'],
		[100, '92%'],
		[200, '83%'],
		[300, '76%'],
		[400, '70%'],
		[500, '64%'],
		[600, '56%'],
		[700, '48%'],
		[800, '41%'],
		[900, '29%']
	]);

	const [CHROMA_MIN, CHROMA_MAX] = [0, 370]; // divided by 1000
	const [HUE_MIN, HUE_MAX] = [0, 360];

	let fallback: boolean = false;
	let chroma = 300;
	let hue = 17;

	// The `style` block is special in Svelte so we have to "hack" our own dynamic style block
	let container: HTMLDivElement;
	$: css = getStyles(chroma, hue);

	$: if (container) {
		container.firstElementChild.textContent = css;
	}

	onMount(() => {
		const child = document.createElement('style');
		child.textContent = css;
		container.appendChild(child);
	});
</script>

<div bind:this={container} />

<div class="w-full my-12">
	<style>
		@supports (color: oklch(0% 0 0)) {
			.show-fallback {
				display: block;
			}
		}
	</style>
	<div class="mb-8 show-fallback hidden">
		<label class="flex font-bold items-center gap-2 text-black">
			<input class="shrink-0 w-4 h-4" type="checkbox" bind:checked={fallback} />
			Show RGB fallback
		</label>
	</div>
	<div class="mb-8 grid grid-cols-5 gap-4 text-center font-black">
		{#each [...PALETTE.keys()] as step}
			<div
				class={`p-3 sm:p-6 rounded relative overflow-hidden`}
				style="background-color: var(--primary-{step});"
			>
				&nbsp;
				{#if fallback}
					<div
						class="absolute inset-0"
						style="background-color: var(--primary-safe-{step}); clip-path: polygon(0% 0, 100% 100%, 0 100%);"
					/>
				{/if}
				<div class={(step > 400 ? 'text-white' : 'text-black') + ' absolute inset-0 p-3 sm:p-6 '}>
					{step}
				</div>
			</div>
		{/each}
	</div>
	<div class="grid grid-cols-2 gap-5 w-full" style="accent-color: var(--primary-500)">
		<label>
			<div>Hue {hue}</div>
			<input class="w-full" type="range" bind:value={hue} min={HUE_MIN} max={HUE_MAX} step={1} />
		</label>
		<label>
			<div>Chroma {chroma / 1000}</div>
			<input
				class="w-full"
				type="range"
				bind:value={chroma}
				min={CHROMA_MIN}
				max={CHROMA_MAX}
				step={1}
			/>
		</label>
	</div>
	<div class="my-8">
		<pre
			class="text-sm">{`/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {${[...PALETTE.entries()].map(
          ([step, lightness]) => `
          ${step}: "oklch(${lightness} ${chroma / 1000} ${hue})"`
        )}
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
`}</pre>
	</div>
</div>
