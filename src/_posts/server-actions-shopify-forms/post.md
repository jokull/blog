---
title: Feature Complete Forms With Server Actions
date: 2024-10-10
---

Next.js v14.0 introduced `<form action={serverAction} />`, giving developers a way to send
a native `FormData` to a server action. The advantage here is that the bundler knows how to
server side render a valid form with native submit. So before JavaScript loads a submit will
work. When JS is loaded you get incremental improvements like client side field validation,
loading states and a page transition or redirect without a full page refresh.

The docs encourage uncontrolled form fields, but I've found the `useFormState` and especially
`useFormStatus` React hooks to be clunky.

But server actions are still one honking great idea. It's an intuitive way to tell the bundler to
take async functions exported in any "use server" file and when called in "use client" components
call an RPC that is as well typed as your TypeScript foo. Instead of the `Promise` going direct in
runtime, it crosses the network boundary where your server action has access to services, secrets
and integrations to perform mutations. Calling `revalidatePath` and/or `redirect` updates the client
cache.

Here's a hook that combines `@shopify/forms` on the frontend for a rich form interaction, and
`neverthrow` and `zod` for server validation and errors.

```ts
import {
	useForm,
	type FieldBag,
	type FormError,
	type FormMapping,
	type FormWithoutDynamicListsInput
} from '@shopify/react-form';
import { type Result } from 'neverthrow';
import { useState } from 'react';

import { hydrateServerResult, type ServerResult } from '~/lib/results';

export function useActionForm<T extends FieldBag, R>({
	fields,
	action
}: Pick<FormWithoutDynamicListsInput<T>, 'fields'> & {
	action: (form: FormMapping<T, 'value'>) => Promise<ServerResult<R, FormError[]>>;
}) {
	const [serverResult, setServerResult] = useState<Result<R, FormError[]> | null>(null);
	const form = useForm({
		fields,
		onSubmit: async (form) => {
			const result = hydrateServerResult(await action(form));
			setServerResult(result);
			if (result.isOk()) {
				return { status: 'success' };
			}
			return { status: 'fail', errors: result.error };
		}
	});
	return {
		...form,
		serverResult,
		isSuccess: serverResult?.isOk() ?? false,
		fieldServerErrors: Object.fromEntries(
			form.submitErrors.flatMap(({ message, field }) => {
				const name = field?.at(0);
				return name ? [[name, message]] : [];
			})
		),
		serverErrors: form.submitErrors.flatMap(({ message, field }) => (field ? [] : [{ message }]))
	};
}
```

Turn `neverthrow` results into serializable objects, so we can return in action responses. Otherwise
Next.js will complain that complex objects cannot be serialized. This also explains `hydrateServerResult`.

```ts
import { err, ok, type Result } from 'neverthrow';

export interface ServerOk<T> {
	value: T;
}

export interface ServerErr<E> {
	error: E;
}

export type ServerResult<T, E> = ServerOk<T> | ServerErr<E>;

export function serverOk<T>(value: T): ServerOk<T> {
	return {
		value
	};
}

export function serverErr<E>(error: E): ServerErr<E> {
	return {
		error
	};
}

export function serverResult<T, E>(result: Result<T, E>): ServerResult<T, E> {
	if (result.isOk()) {
		return { value: result.value };
	}
	return { error: result.error };
}

export function hydrateServerOk<T>(serverOk: ServerOk<T>) {
	return ok(serverOk.value);
}

export function hydrateServerErr<E>(serverErr: ServerErr<E>) {
	return err<never, E>(serverErr.error);
}

export function hydrateServerResult<T, E>(result: ServerOk<T> | ServerErr<E>): Result<T, E> {
	if ('error' in result) {
		return hydrateServerErr(result);
	} else {
		return hydrateServerOk(result);
	}
}
```

Some helper utilities to turn zod validation into `@shopify/forms` field errors.

```ts
import { type FormError } from '@shopify/react-form';
import { type ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export function zodErrorToFormError<T>(zodError: ZodError<T>): FormError[] {
	return fromZodError(zodError).details.map(({ path, message }) => ({
		field: path.flatMap((component) => (typeof component === 'string' ? [component] : [])),
		message
	}));
}
```

Here's how you would use the hook in a client component. Again, if the page JavaScript hasn't loaded
a form submit will annoyingly reload the page since an undefined `action` attribute defaults to
current page, and the method is GET. In theory, this can be remedied for "best of both worlds"
approach by assigning the server action to the form, letting the server action detect if `formData`
is being sent and then do its best to validate it against the zod schema.

```tsx
'use client';

import { useField } from '@shopify/react-form';

import { Button } from '~/components/ui/button';
import { FormInput } from '~/components/ui/form-input';
import { Textarea } from '~/components/ui/textarea';
import { useActionForm } from '~/lib/use-action-form';

import { submitContactForm } from '../actions';

export function ContactForm() {
	const { fields, submit, fieldServerErrors, serverErrors, isSuccess, submitting } = useActionForm({
		fields: {
			name: useField(''),
			email: useField(''),
			message: useField('')
		},
		action: submitContactForm
	});
	const t = useTranslations('ContactForm');

	return (
		<form
			onSubmit={(event) => {
				void submit(event);
			}}
			className="space-y-4"
		>
			<FormInput
				name="name"
				errorMessage={fieldServerErrors.name ?? fields.name.error}
				{...fields.name}
				placeholder="Your name"
			/>
			<FormInput
				name="email"
				errorMessage={fieldServerErrors.email ?? fields.email.error}
				{...fields.email}
				placeholder="Your email"
				type="email"
			/>
			<Textarea
				value={fields.message.value}
				onChange={(event) => {
					fields.message.onChange(event.target.value);
				}}
				placeholder="Message"
			/>
			<div className="mt-4">
				{serverErrors.map(({ message }) => (
					<p key={message} className="text-japan font-normal">
						{message}
					</p>
				))}
			</div>
			<div className="mt-4 flex items-center justify-end gap-4">
				{isSuccess ? (
					<div className="text-green font-medium">Sent! We’ll reach out shortly.</div>
				) : null}
				<Button
					className="min-w-64"
					type="submit"
					variant="outline"
					key="submit"
					disabled={submitting || isSuccess}
				>
					{t('submit')}
				</Button>
			</div>
		</form>
	);
}
```

And here's the server action. Assigning the form type to `z.input` is a nice little touch
to get static analysis of the schema and form output.

```ts
'use server';

import { z } from 'zod';

import { zodErrorToFormError } from '~/lib/form-errors';
import { serverErr, serverOk } from '~/lib/results';

const schema = z.object({
	name: z.string().min(1, { message: 'Name is required' }),
	email: z.string().email(),
	message: z.string().optional()
});

export async function submitContactForm(form: z.input<typeof schema>) {
	const result = schema.safeParse(form);
	if (!result.success) {
		return serverErr(zodErrorToFormError(result.error));
	}
	// Do something with the validated `result.data`
	return serverOk('ok');
}
```

I find this gives me an incremental approach, starting with robust server errors, optional
client validation in `useField({value: "", validate: () => ...})`, and an elegant way to
have static inferrence mapping the form fields to the zod schema. If the form shape doesn't match
the zod schema you'll get a type error.

It comes down to being team-bound or team-unbound form controls. Unbound means you leave more
functionality to the browser. Bound gives you more _drumroll_ control over the final form
shape, realtime validation etc. Your mileage may vary.
