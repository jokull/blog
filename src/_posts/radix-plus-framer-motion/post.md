---
title: Create a Stunning Dialog Component with Radix UI, Tailwind CSS & Framer Motion
date: 2023-02-02
---

<script lang="ts">
  import Stackblitz from "../components/Stackblitz.svelte";
</script>

Welcome to the ultimate guide on creating a captivating, responsive dialog component that will level
up your UI game! In this tutorial, we'll dive into the world of Radix UI, Tailwind CSS, and Framer
Motion to create a dialog that animates from the bottom up on mobile viewports and slides in from
the right like a drawer on desktop.

By following these step-by-step instructions, you'll learn how to create a versatile, accessible,
and visually stunning component that's sure to impress. Get ready to elevate your web development
skills and leave a lasting impression on your audience.

1. Setting Up the Project To kick things off, let's clone the starter repo that has React and Vite
   already set up for you. Open your terminal and run the following commands:

Copy code

```bash
git clone https://github.com/your-username/react-vite-starter.git
cd react-vite-starter
npm install
```

Next, we'll install the necessary dependencies: Radix UI, Tailwind CSS, and Framer Motion.

Copy code

```bash
npm install -D tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog framer-motion
npm install usehooks-ts classnames
```

2. Integrating Tailwind CSS

```bash
npx tailwindcss init -p
```

Now that our project is set up, it's time to configure Tailwind CSS. First, create a configuration
file, then import the base styles into your project.

1. Building the Dialog Component With Tailwind CSS integrated, let's start building our dialog
   component. We'll leverage the power of Radix UI to create an accessible, flexible, and
   customizable component.

1. Adding Framer Motion Animation With our dialog component in place, it's time to breathe life into
   it using Framer Motion. We'll create two animations: one for mobile viewports and another for
   desktop.

1. Creating Responsive Animations To ensure our dialog component looks fantastic on both mobile and
   desktop devices, we'll use Tailwind CSS breakpoints to detect the viewport size and apply the
   appropriate animation.

1. Enhancing the Dialog with Additional Functionality Now that our responsive dialog component is
   ready, let's add some finishing touches. We'll explore how to further customize our dialog and
   make it even more engaging.

1. Conclusion Congratulations! You've just created a stunning, responsive dialog component using
   Radix UI, Tailwind CSS, and Framer Motion. With this new skill set, you're ready to tackle more
   complex UI challenges and create truly memorable user experiences.

By following this step-by-step guide, you'll not only learn how to create a visually appealing and
accessible dialog component but also improve your proficiency with Radix UI, Tailwind CSS, and
Framer Motion. So, don't wait any longer - let's dive in and start creating some magic!

<Stackblitz id="radix-dialog-w-framer-motion" options={{
    forceEmbedLayout: true,
    openFile: 'src/dialog.tsx',
    clickToLoad: true,
  }} />
