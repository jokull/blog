import getPosts from '$lib/getPosts';

const siteUrl = 'https://nenadkostic.com';

const renderXmlRssFeed = (posts) => `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Jökull Sólberg</title>
    <link>${siteUrl}</link>
    ${posts
			.map(
				(post) => `
    <item>
       <title>${post.title}</title>
       <link>${siteUrl}/${post.slug}</link>
       <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>
    `
			)
			.join('\n')}
  </channel>
</rss>`;

export async function get() {
	const feed = renderXmlRssFeed(await getPosts());
	return {
		body: feed,
		headers: { 'content-type': 'application/rss+xml' }
	};
}
