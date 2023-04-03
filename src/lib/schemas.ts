import { z } from 'zod';

export const postSchema = z.object({
	title: z.string(),
	date: z.coerce.date(),
	slug: z.string(),
	image: z.string().optional(),
	locale: z.string().optional(),
	isDraft: z.coerce.boolean().default(false)
});

export const bookSchema = z.object({
	title: z.string(),
	author: z.string(),
	link: z.string(),
	imageUrl: z.string(),
	slug: z.string(),
	subtitle: z.string().optional()
});
