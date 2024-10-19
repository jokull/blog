---
title: Integrating Dokobit eID with Shopify Checkout in Next.js
date: 2024-10-19
isDraft: true
---

Handling verified user data in e-commerce can be tricky—especially when it comes to age verification
and identity checks. While Shopify’s Storefront API offers great flexibility, it doesn’t support eID
verification natively. In this guide, we'll walk through integrating [Dokobit’s eID
solution](https://www.dokobit.com/solutions/e-identification-api) into a custom Shopify storefront
checkout using **Next.js**, **TypeScript**, and **Zod schemas**. We'll leverage **custom routes** to
redirect users to Dokobit for authentication and then enrich Shopify customer data with verified
details, such as the Icelandic kennitala or phone number.

<img src="https://ss.solberg.is/8f4XSPRn+" alt="Circle combining Dokobit, Shopify and Next.js into an illustration">

Here’s how it works: we'll create a `/checkout` route in Next.js that kicks off the Dokobit
verification flow, manages the response, and updates the Shopify cart with verified user data—all in
TypeScript, ensuring type safety throughout.

## Dokobit mini-SDK

First let's make a mini-SDK at `~/lib/dokobit.ts` for the Dokobit eID service.

We'll export functions that give us a type safe way to do start an auth session
(`createDokobitSession`) and fetch it again (`getDokobitSession`). We'll then call these in our
checkout route handler.

```ts
import { z } from 'zod';

import { env } from '~/env';

const dokobitCreateResponseSchema = z.object({
	status: z.enum(['ok']),
	session_token: z.string(),
	url: z.string(),
	expires_in: z.number() // Number of seconds
});

export async function createDokobitSession(returnUrl: string) {
	const response = await fetch(`${env.DOKOBIT_URL}/create?access_token=${env.DOKOBIT_TOKEN}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ return_url: returnUrl.toString() })
	});

	if (response.status !== 200) {
		throw new Error(await response.text());
	}
	return dokobitCreateResponseSchema.parse(await response.json());
}

// Define the Dokobit session success schema
const dokobitSessionResponseSchema = z.object({
	status: z.string(),
	session_token: z.string(),
	code: z.string(),
	country_code: z.string(),
	name: z.string(),
	surname: z.string(),
	authentication_method: z.string(),
	date_authenticated: z.string(),
	phone: z.string().optional()
});

// Define the Dokobit error schema
const dokobitSessionStatusErrorResponseSchema = z.object({
	status: z.literal('error'),
	message: z.string()
});

export async function getDokobitSession(sessionToken: string) {
	const response = await fetch(
		`${env.DOKOBIT_URL}/${sessionToken}/status?access_token=${env.DOKOBIT_TOKEN}`
	);

	if (!response.ok) {
		throw new Error(await response.text());
	}

	const data = await response.json();

	// Check if the response is an error
	const errorValidation = dokobitSessionStatusErrorResponseSchema.safeParse(data);
	if (errorValidation.success) {
		throw new Error(errorValidation.data.message);
	}

	// Validate against the DokobitSession schema
	return dokobitSessionResponseSchema.parse(data);
}
```

## Starting the identification step

Assuming the user has added items to their Shopify cart - you can start the redirect flow from your
site, to Dokobit, to Shopify checkout by submitting a POST to `/checkout` wherever makes sense in
your layout and components.

```html
<form method="POST" action="/checkout">
	<button type="submit">Checkout</button>
</form>
```

On a POST request, we’ll initiate the Dokobit session and redirect the user to Dokobit’s
authentication page. We use **Zod** to validate responses and ensure they match the expected schema.

## Dokobit route handler

Set up GET and POST route handlers for the `/checkout` route at `~/app/checkout/route.ts`. I've kept
the Shopify cart update code which uses the amazing [gql.tada🪄](https://gql-tada.0no.co) library to
statically infer variable and result types of GraphQL queries without a codegen step.

```ts
import { type VariablesOf } from 'gql.tada';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '~/env';
import { client, graphql } from '~/graphql/shopify';
import { getSession } from '~/lib/cart';
import { createDokobitSession, getDokobitSession } from '~/lib/dokobit';

export const runtime = 'edge';

const updateCartAttributes = graphql(`
	mutation CartAttributesUpdate(
		$cartId: ID!
		$buyerIdentidy: CartBuyerIdentityInput!
		$attributes: [AttributeInput!]!
	) {
		cartAttributesUpdate(attributes: $attributes, cartId: $cartId) {
			__typename
		}
		cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentidy) {
			__typename
			cart {
				checkoutUrl
			}
		}
	}
`);

type ShopifyCountryCode = NonNullable<
	VariablesOf<typeof updateCartAttributes>['buyerIdentidy']
>['countryCode'];

// On POST request to start the dokobit verification process and redirect to it
export async function POST() {
	// Construct the Next.js URL we want the user to return to - this will actually be the GET handler
	// below.
	const returnUrl = new URL('/checkout', `https://${env.VERCEL_URL}/`);
	const session = await createDokobitSession(returnUrl.toString());
	// Redirect the user to the Dokobit authentication URL
	throw redirect(session.url);
}

// On GET requests process the dokobit based on the ?session_token, if presented
export async function GET(request: NextRequest) {
	// Get the Dokobit `?session_token=` value
	const dokobitSessionToken = request.nextUrl.searchParams.get('session_token');

	// Get the Shopify cart ID - in this case it's stored in the cookie header.
	const cartId = await getSession().then((session) => session?.cartId);

	if (!dokobitSessionToken || !cartId) {
		return NextResponse.json({ message: 'Session or cart not found' }, { status: 400 });
	}

	const dokobitSession = await getDokobitSession(dokobitSessionToken);

	const fullName = `${dokobitSession.name} ${dokobitSession.surname}`;

	// At the risk of one or two country codes not being present in Shopify API ...
	const countryCode =
		dokobitSession.country_code.toLocaleUpperCase() as unknown as ShopifyCountryCode;

	const response = await client.request(updateCartAttributes, {
		cartId,
		buyerIdentidy: {
			phone: dokobitSession.phone,
			countryCode
		},
		attributes: [
			{ key: 'kennitala', value: dokobitSession.code },
			{ key: 'name', value: fullName }
		]
	});

	const checkoutUrl = response.cartBuyerIdentityUpdate?.cart?.checkoutUrl;

	if (!checkoutUrl) {
		return NextResponse.json({ message: 'Shopify checkout URL not found' }, { status: 400 });
	}

	// Let the user continue to the Shopify hosted checkout page.
	return NextResponse.redirect(checkoutUrl);
}
```

The storefront code to [Somm.is](https://www.somm.is/), my own store using this code, is [open
sourced](https://github.com/jokull/somm-next). Feel free to use it as a reference for your own
storefront or Dokobit integration.

**Key Takeaways**

- **Zod Schemas**: Type-safe validation with Zod ensures API responses are handled correctly.
- **Custom Next.js Routes**: Both GET and POST routes are used for creating Dokobit sessions and
  handling user redirection.
- **GraphQL API**: We use Shopify’s Storefront GraphQL API to enrich the cart with verified user
  data, including Icelandic kennitala.

This integration gives you fine control over identity verification in your Shopify checkout,
something Shopify doesn’t offer out of the box. With Dokobit, you can easily verify users, enrich
customer data, and ensure compliance for age-restricted products—all with a seamless Next.js
developer experience.
