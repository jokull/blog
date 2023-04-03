---
title: Create a Dialog Component with Radix UI, Tailwind CSS & Framer Motion
date: 2023-04-02
---

<script lang="ts">
  import Stackblitz from "../../components/Stackblitz.svelte";
</script>

In this tutorial, we'll dive into the world of Radix UI, Tailwind CSS, and Framer Motion to create a
dialog that animates from the bottom up on mobile viewports and slides in from the right like a
drawer on desktop.

By following these step-by-step instructions, you'll learn how to create a versatile, accessible,
and visually impressive component.

To get you started quickly, here's a project demonstrating the component. Resize the mini-browser
area to see the different transitions and layouts for the modal in smaller and larger viewports.

<Stackblitz id="radix-dialog-w-framer-motion" options={{
	forceEmbedLayout: true,
	openFile: 'src/dialog.tsx',
	clickToLoad: true,
}} />

**Setting up the project to kick things off.**

Fork the Stackblitz project above, or if you'd like to add this to your own React project, roughly
follow these commands:

```bash
npm create vite@latest my-react-app -- --template react-ts
cd my-react-app
npm install
```

Next, we'll install the necessary dependencies: Radix UI, Tailwind CSS, and Framer Motion.

```bash
npm install -D tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog framer-motion
npm install usehooks-ts classnames
```

**Integrating Tailwind CSS**

```bash
npx tailwindcss init -p
```

Copy the `tailwind.config.cjs` and `index.css` from the Stackblitz.

You should now be able to run the project

```bash
npm run dev
```

**Building the Dialog Component With Tailwind CSS integrated, let's start building our dialog
component. We'll leverage the power of Radix UI to create an accessible, flexible, and
customizable component.**

[Radix dialogs](https://www.radix-ui.com/docs/primitives/components/dialog) have a specific
component structure. We'll be relying on Radix for accessibility and certain behavior expected of
dialogs, focus trapping, keyboard navigation and more.

```jsx
import * as Dialog from '@radix-ui/react-dialog';
export default () => (
	<Dialog.Root>
		<Dialog.Trigger />
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content>
				<Dialog.Title />
				<Dialog.Description />
				<Dialog.Close />
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
);
```

This looks a bit verbose, but every component serves a purpose.

Radix renders the dialog in a portal outside the React DOM hierarchy which makes it easier to
style and position on top of the UI.

We'll want to animate both the `Dialog.Overlay` and the `Dialog.Content`. The overlay is a
layer between the UI and dialog itself which we'll use to block and tint the UI so that it
looks inaccessible, drawing attention to the dialog.

An easy way to let Frame Motion animate these elements is to ask Radix to always keep the top level
`Dialog.Portal` mounted and wrap it in `AnimatePresence`. This way we can pass an `open` prop to
toggle the portal.

Before continuing to the actual animation, you might be wondering about `useMediaQuery`. Aren't
media queries a CSS thing? Usually yes, but Frame Motion does not have a notion of media queries so
we'll have to use this hook from the [usehook-ts](http://usehooks-ts.com) collection library.
Another way to achieve this is to write two separate components and simply toggle visibility with
media query targeting, or simply use CSS animations and not Framer Motion. Using the hook we can
have just one component.

```jsx
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    open: boolean;
  }
>(({ className, children, open, ...props }, ref) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  return (
    <AnimatePresence>
      {open ? (
        <DialogPortal forceMount>
					{/* see next snippet 👇🏻 */}
        </DialogPortal>
      ) : null}
    </AnimatePresence>
  );
});
```

The `forceMount` is necessary to let Frame Motion keep the component around during its exit animation.

### Adding Framer Motion Animation

**With our dialog component in place and wrapped in `AnimatePresence`, it's time to breathe life
into it using Framer Motion. We'll create two animations: one for mobile viewports and another for
desktop.**

The `Dialog.Overlay` is wrapped in a simple opacity in-out animation.

```jsx
<DialogPortal forceMount>
	<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
		<DialogOverlay className="bg-black/50" />
	</motion.div>
	<DialogPrimitive.Content asChild ref={ref} {...props}>
		{/* see next snippet for content 👇🏻 */}
	</DialogPrimitive.Content>
</DialogPortal>
```

Now let's zoom into the main part - `Dialog.Content`! Here we're using the `isMobile` to toggle
between animating the full width of the dialog from the right on desktop, or the full height
from the bottom, like a sheet UI that is common on smaller screens, where controls and buttons are
likely to be closer to the thumb.

Notice that `{children}` is being passed in, letting us re-use this component for different dialog
use cases – like confirmation dialogs, settings, user input and more.

```jsx
<DialogPrimitive.Content asChild ref={ref} {...props}>
	<motion.div
		initial={isMobile ? { y: '100%' } : { x: '100%' }}
		animate={isMobile ? { y: 0 } : { x: 0 }}
		exit={isMobile ? { y: '100%' } : { x: '100%' }}
		transition={{ ease: 'linear', duration: 0.15 }}
		className={classNames(
			'fixed z-50 mx-4 flex max-h-[80vh] w-full flex-col gap-4 overflow-y-auto rounded-t-xl bg-white p-6',
			'sm:mr-0 sm:h-screen sm:max-h-none sm:max-w-lg sm:rounded-none sm:shadow-lg',
			className
		)}
	>
		<div className="flex w-full justify-end sm:justify-start">
			<DialogPrimitive.Close asChild>
				<Button>Close</Button>
			</DialogPrimitive.Close>
		</div>
		{children}
	</motion.div>
</DialogPrimitive.Content>
```

[Framer Motion](http://framer.com/motion/examples/) provides an expressive and complete
control of animations - from simple to complex orchestrated transitions.

**Congratulations! You've just created a responsive dialog component using Radix UI,
Tailwind CSS, and Framer Motion.**

Here's how the component is put to use, with a single state hook.

```jsx
function App() {
	const [open, setOpen] = useState(false);
	return (
		<div className="p-4">
			<Dialog
				onOpenChange={(open) => {
					setOpen(open);
				}}
			>
				<DialogTrigger asChild>
					<Button>Open</Button>
				</DialogTrigger>
				<DialogContent open={open}>
					<DialogHeader>
						<DialogTitle>I'm a dialog</DialogTitle>
						<DialogDescription asChild>
							<div>Content - put anything here!</div>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</div>
	);
}
```

I hope the combination of libraries presented here has given you some ideas for how to create
more accessible and good looking interactive components for your project. A great place to explore
good component practises is [github.com/shadcn/ui](http://github.com/shadcn/ui) - a great collection
of components using Radix UI and Tailwind. In fact - this component is largely based on shadcn's
dialog wrapper.
