// GET /api/mobile/blog                  — every post (newest first) and the
//                                          blog categories
// GET /api/mobile/blog?category=<slug>  — one category's posts
// GET /api/mobile/blog?id=<id>          — one post with its content and three
//                                          related posts
//
// Read-only.

import {
  getAllBlogPosts, getBlogCategories, getBlogPost, getBlogPostsByCategory, getRelatedBlogPosts,
} from '@/lib/catalog';
import {
  fail, img, ok, readyMedia, unavailable,
} from '@/lib/mobile';

export const dynamic = 'force-dynamic';

const card = ({ contentHtml, ...post }) => ({ ...post, image: img(post.image), webUrl: img(post.url) });

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const id = Number(params.get('id'));
  const category = params.get('category');

  try {
    await readyMedia();

    if (id) {
      const post = await getBlogPost(id);
      if (!post) return fail('Post not found.', 404);
      const related = await getRelatedBlogPosts(post, 3);
      return ok({
        post: { ...card(post), contentHtml: post.contentHtml },
        related: related.map(card),
      });
    }

    const [posts, categories] = await Promise.all([
      category ? getBlogPostsByCategory(category) : getAllBlogPosts(),
      getBlogCategories(),
    ]);
    return ok({
      posts: posts.map(card),
      categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    });
  } catch (err) {
    return unavailable(err, 'blog');
  }
}
