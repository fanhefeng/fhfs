export type SharePost = { title: string; date: string; tags: string[] };
export type ShareImages = Record<string, { signature: string; path: string }>;

/** Only the text actually printed on the card determines whether it is current. */
export function shareSignature(post: SharePost, counterpart?: SharePost): string {
  return JSON.stringify([
    post.title,
    counterpart && counterpart.title !== post.title ? counterpart.title : null,
    post.date,
    post.tags.slice(0, 3),
  ]);
}

export function shareImagePath(
  images: ShareImages,
  locale: string,
  slug: string,
  post?: SharePost,
  counterpart?: SharePost,
): string {
  const image = images[`${locale}/${slug}`];
  return post && image?.signature === shareSignature(post, counterpart)
    ? image.path
    : `/share-images/cover-${locale}.png`;
}
