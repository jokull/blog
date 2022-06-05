import getBooks from '$lib/getBooks';
import getPosts from '$lib/getPosts';

/** @type {import('@sveltejs/kit').GetSession} */
export const getSession = async () => {
	return {
		posts: await getPosts(),
		books: await getBooks()
	};
};
