export const NextResponse = {
  redirect: (url: string | URL, status = 307) => Response.redirect(url, status),
};
