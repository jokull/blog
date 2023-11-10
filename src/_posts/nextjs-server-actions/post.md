---
title: Next.js Server Actions Simplify Everything
date: 2023-11-10
---

As a fullstack developer, I'm constantly searching for perfect tooling. I need tools that support rich UI interactivity and are SEO-friendly. They should be easy to host and get going locally, yet capable of scaling with the project's growth without compromising core stack components. Moreover, they should encompass all aspects of developer experience (DX) – elegant form validation, authentication, transactional email, migrations, timezones, fonts, caching, toasts, analytics, and yes, testing.

I aim to use tools like Framer Motion to add zest to UI without inflating client bundle sizes. Server-side rendering (SSR) is essential for SEO-friendly initial page loads, ideally executed at the edge to minimize latency.

## From 80/20 backend/frontend to 20/80 …

In my Django and Flask days, about 80% of the work was backend-focused. Forms submissions were handled by differentiating HTTP methods, redirecting on success, or re-displaying the form with errors. This simpler approach changed with React, promising a declarative way to manipulate the DOM with client-side routing. While it improved user experience, it also increased developer complexity. The backend transformed into an API for business logic and data storage.

This client-rich approach made backends more client-agnostic, catering to both web and mobile clients. It led to clearer roles in larger teams and the use of GraphQL, OpenAPI, or tRPC specs as a cohesive element between separate projects, which sometimes drifted apart, risking inconsistencies and errors.

For Single Page Applications (SPAs) not requiring SSR, this division became standard. But for SEO-critical sites, React-based backends emerged. Major web frameworks developed methods for server-side data loading to render initial HTML and enable client-side routing. This increased complexity, as the frontend had to operate in two distinct runtimes: Node.js for the backend and the browser for the frontend. As business logic intertwined with data loading for SSR, larger client bundles were sent to browsers.

So, where do we go from here? There's a nostalgia for the simpler days of a unified codebase for web products. With advanced forms requiring hefty bundles and intricate event handlers, we've seen subtle yet significant regressions in basic UX. Developers intuitively understand that as stack complexity grows, so does the likelihood of hidden bugs.

## … and back again

Acknowledging these complexities, the JavaScript community has been diligently working on an alternative.

Remix reemphasized SSR and its associated data loading, transforming it from a mere API wrapper to a fundamental aspect of page construction and delivery. It uses `FormData` (with extensive Zod parsing), encouraging developers to adopt uncontrolled fields, server-side validation, and progressive enhancement. Remix challenges developers to reconsider the use of `event.preventDefault()`, advocating for leveraging the capabilities of robust browsers and handling POST requests as done traditionally in Django or Rails.

## Server Actions

The introduction of Server Actions in Next.js marks a significant move towards more straightforward, server-rendered pages, seamlessly integrated with modern web functionalities. As I recently expressed in a tweet, Server Actions are the final piece of the App Router puzzle. They revolutionize how mutations are handled, allowing for the use of real forms or manual useTransition. This innovation enables data to be fetched, written, and revalidated without the need for dedicated state libraries.

Forms can be progressively enhanced and embellished using form libraries for fancy client validation and input assistance. However, at their core, they are submitted using `FormData`, with validation being handled by conform, Zod, or manual methods inside Server Actions. This shift towards conducting all validation on the backend, especially with the speed offered by edge computing, presents a simple and efficient approach for form validation feedback in many scenarios.

This strategic realignment of the server-client boundary simplifies the overall architecture, significantly reducing the complexity associated with managing disparate client and server codebases. With Server Actions, developers are empowered to create efficient, progressively enhanced web applications using a single, fullstack tool.

## Testing The Waters

Recently, I refactored [gymrat](https://www.gymrat.is/), a side project I use to test new tools like Next.js Server Actions. The previous setup was a dual structure with Next.js App Router serving as both an SSR backend and a rich client frontend, coupled with a tRPC-based API on Cloudflare Workers using SQLite's D1 storage. It involved two types of tRPC clients: one for server component queries using async-await and another utilizing React Query for client-side queries and mutations. API requests going from the client would proxy via a `/trpc` catch-all route to consolidate the two projects to a singular domain and avoid CORS and cookie headaches.

The reason tRPC was kept separate and not hosted as a Next.js route was that D1 bindings only work when developing and hosting with Cloudflare Workers tooling directly, and not on Vercel. And on the flip side, Next.js does not comfortably or easily host on Cloudflare Workers despite lots of community pressure and work towards that goal. So, the resulting split down the middle resulting in two hosting vendors and a proxy route to connect them on the same domain.

With App Router I can eliminate:

- tRPC: Instead use Server Actions for mutations and Server Components for loading
- React-Query: Instead use `revalidatePath` instead

Those are both incredible tools with large communities and incredible developers supporting them. They're also invaluable in managing a stack supporting rich clients. So what does it mean if Server Actions and Components can replace them? I believe it's nothing short of the biggest evolutionary step for Next.js thus far. Many have publicly decried the departure of Next.js from Pages to the new App Router - and understandably so since it's really a radically different approach.

As of Next.js 14 released October 26, 2023, now is a great time to dive in.

I'll spare you explaining how login worked with tRPC, but suffice to say that server actions was a massive cleanup on this front:

Now the login action looks like this:

```ts
export async function login(prevState: unknown, formData: FormData) {
	const result = z
		.object({
			email: z.string().email(),
			password: z.string().min(6)
		})
		.safeParse({
			email: formData.get('email'),
			password: formData.get('password')
		});

	if (!result.success) {
		return 'Email and password required';
	}

	const form = result.data;

	const email = normalizeEmail(form.email);

	const db = getDrizzle();
	const dbUser = await db.query.user.findFirst({
		where: eq(user.email, email)
	});

	if (!dbUser) {
		return 'No user found';
	}

	if (!verifyPassword(form.password, dbUser.hashedPassword)) {
		return 'This password is incorrect';
	}

	await setAuthCookie(email);

	redirect('/dashboard');
}
```

And can be called simply like this:

```tsx
export function Form(props: { login }) {
	const [message, action] = useFormState(props.login, null);

	return (
		<form className="mb-4 flex flex-col gap-4" action={action}>
			<Input
				type="email"
				name="email"
				autoComplete="username"
				autoCorrect="off"
				placeholder="Your email address"
			/>
			<Input
				type="password"
				name="password"
				autoComplete="current-password"
				placeholder="Your password"
			/>
			<Primary>Submit</Primary>
			<AnimatePresence>
				{message && (
					<motion.div
						layout
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: -10 }}
						className="my-8 rounded-md bg-red-600/20 px-3 py-2 text-center font-medium text-red-500"
					>
						<p>{message}</p>
					</motion.div>
				)}
			</AnimatePresence>
		</form>
	);
}
```

Notice:

- Input elements are uncontrolled!
- Usage of Framer Motion means we have crossed the server-client boundary - i.e. this is a client component and we have passed the server action as a _prop_ from server to client. This is powerful stuff.
- Validation is handled purely by server, where we can handle looking up users, password matching etc.
- Server Action returns strings which I've named `message` in the example above.

## Augmenting the Next.js App Router With Edge Storage

During the refactoring I used the opportunity to switch from D1 and the Kysely query builder to Drizzle ORM and Turso, a storage solution backed by libSQL, Turso's own open source fork of SQLite. I am an early adapter of Turso in a company I founded, [Trip To Japan](https://www.triptojapan.com) and am thoroughly impressed by the work and team behind Turso.

Setting up Drizzle and Turso is a breeze:

Inside your Next.js App Router project set up `drizzle.config.ts`. This file will serve as a binding between your schema and Drizzle Kit, a migration and data explorer suite.

```ts
import "dotenv/config";

import type { Config } from "drizzle-kit";

export default {
  out: "./drizzle",
  schema: "./schema.ts",
  strict: true,
  verbose: true,
  ...(process.env.DATABASE_AUTH_TOKEN && process.env.NODE_ENV == "production"
    ? {
        driver: "turso",
        dbCredentials: {
          url: process.env.DATABASE_URL ?? "",
          authToken: process.env.DATABASE_AUTH_TOKEN,
        },
      }
    : {
        driver: "libsql",
        dbCredentials: { url: process.env.DATABASE_URL ?? "" },
      }),
} satisfies Config;
```

As you can see, I use Turso in production, but raw-dog the underlying libSQL tech in development. This allows me to read and write to a regular SQLite 3 database file that can be explored in an app like TablePlus - as opposed to being tied to an external networked service in development mode.

Here's the gymrat schema defined in TypeScript. Drizzle uses powerful inference of these schemas to provide a query builder with typed parameters and output.

```ts
import { InferSelectModel, relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const user = sqliteTable('User', {
	id: text('id')
		.primaryKey()
		.default(sql`(uuid())`)
		.notNull(),
	apiKey: text('apiKey').notNull(),
	email: text('email').unique().notNull(),
	displayEmail: text('displayEmail').notNull(),
	hashedPassword: text('hashedPassword').notNull()
});

export const workout = sqliteTable('Workout', {
	id: text('id')
		.primaryKey()
		.default(sql`(uuid())`)
		.notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
		.default(sql`(strftime('%s', 'now'))`)
		.notNull(),
	description: text('description').notNull(),
	value: text('value').notNull(),
	numberValue: integer('numberValue').default(0).notNull(),
	isTime: integer('isTime', { mode: 'boolean' }).default(false).notNull(),
	date: integer('date', { mode: 'timestamp' }).notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id)
});

// Define relationships
export const userRelations = relations(user, ({ many }) => ({
	workouts: many(workout)
}));

// Create schemas for insert and select operations using Drizzle Zod, if needed
export const insertUserSchema = createInsertSchema(user);
export const selectUserSchema = createSelectSchema(user);

export const insertWorkoutSchema = createInsertSchema(workout);
export const selectWorkoutSchema = createSelectSchema(workout);

export type User = InferSelectModel<typeof user>;
export type Workout = InferSelectModel<typeof workout>;

export default {
	user,
	workout,
	userRelations,
	insertUserSchema,
	selectUserSchema,
	insertWorkoutSchema,
	selectWorkoutSchema
};
```

The following server action authenticates the user based on the cookie, validates the input and proceeds to write a new row the the Workouts table. Finally, and crucially, it uses `revalidatePath` to instruct the client the refetch workouts now that it knows the state has become stale due to the new workout being saved. Usually this is managed by the client, but I feel that this is a more natural place to trigger this, right after writing the data!

```ts
export async function createWorkout(prevState: unknown, formData: FormData) {
	const { dbUser, db } = await getLoginContext();

	if (!dbUser) {
		redirect('/login');
	}

	const result = z
		.object({
			description: z.string().min(1),
			value: z.string()
		})
		.safeParse({
			description: formData.get('description'),
			value: formData.get('value')
		});

	if (!result.success) {
		return 'Description and value required';
	}

	const form = result.data;

	const { value: numberValue, isTime } = getNumberValue(form.value);

	await db
		.insert(workout)
		.values({
			userId: dbUser.id,
			date: new Date(),
			id: crypto.randomUUID(),
			numberValue,
			value: form.value,
			isTime,
			description: form.description
		})
		.run();

	revalidatePath('/dashboard');
}
```

Finally I'm going to demonstrate how forms can be juiced with autocomplete and fancier interactions than the standard form field components browsers provide. In this component I'm having the server action passed from above, but using `<input type="hidden" />` to copy over a controlled field value - something routine in Django type stacks when augmenting forms with interactivity and high fidelity UI. In this example I'm mixing and matching controlled and uncontrolled - ultimately just ensuring that whatever `FormData` is constructed by the browser is what is sent to the server via the Server Action.

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useDebounce } from "usehooks-ts";

import { Primary } from "~/components/button-";
import { type createWorkout as createWorkoutAction } from "~/db/actions";
import { getNumberValue } from "~/utils/workouts";

import { Autocomplete, type Item } from "./auto-complete";

export function CreateWorkout({
  createWorkout,
  workoutDescriptions,
}: {
  createWorkout: typeof createWorkoutAction;
  workoutDescriptions: Item[];
}) {
  const [message, action] = useFormState(createWorkout, null);
  return (
    <form action={action}>
      <CreateWorkoutFieldset workoutDescriptions={workoutDescriptions} />
      {message}
    </form>
  );
}

export function CreateWorkoutFieldset({
  workoutDescriptions,
  isPromo = false,
}: {
  workoutDescriptions: Item[];
  isPromo?: boolean;
}) {
  const { pending } = useFormStatus();
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const numberValue = getNumberValue(value);
  const valueType: "empty" | "value" | "time" =
    value.trim() === "" ? "empty" : numberValue.isTime ? "time" : "value";
  const debouncedValueType = useDebounce(valueType, 500);
  return (
    <fieldset
      className="flex w-full flex-wrap items-end gap-4"
      disabled={pending}
    >
      <input type="hidden" name="description" value={description} />
      <div className="grow-[5] basis-[180px]">
        <Autocomplete
          items={workoutDescriptions}
          value={{ description }}
          onChange={(item) => {
            setDescription(item.description);
          }}
        />
      </div>
      <div className="grow-[3] basis-[100px]">
        <label className="inline-flex min-w-0 flex-col">
          <AnimatePresence mode="popLayout">
            <motion.span
              className="block text-left text-sm font-medium leading-6 text-gray-400"
              layout
              transition={{ duration: 0.25 }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              key={debouncedValueType}
            >
              {debouncedValueType === "empty" ? "Time / Unit" : null}
              {debouncedValueType === "time" ? "Time" : null}
              {debouncedValueType === "value" ? "Weight / Reps" : null}
            </motion.span>
          </AnimatePresence>
          <input
            className="w-full rounded-md border border-neutral-600 bg-transparent px-3 py-1.5 placeholder:text-neutral-700"
            name="value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
      </div>
      <div className="relative grow-[1] basis-[80px]">
        {isPromo ? (
          <>
            <div className="absolute -right-[5px] -top-[5px] z-10 h-2.5 w-2.5 animate-ping rounded-full bg-pink-500" />
            <div className="absolute -right-1 -top-1 z-20 h-2 w-2 rounded-full bg-white" />
          </>
        ) : null}
        <Primary
          type="submit"
          className="z-30 w-full"
          disabled={value.trim() === "" || description.trim() === ""}
        >
          <span className="@container font-bold">
            <span className="@sm:hidden">Save</span>
            <span className="@sm:inline hidden">Record New Workout</span>
          </span>
        </Primary>
      </div>
    </fieldset>
  );
}
```

I hope these examples have provided some insight and starting points for you to test server actions!

The [gymrat repo](http://github.com/jokull/gymrat) is open source if you want to fork it or look around for more code samples.
