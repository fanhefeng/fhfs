import Link from "@/components/ui/Link";

import { AdminChrome } from "../AdminChrome";
import { buttonClass } from "../styles";
import { PostsList } from "./PostsList";

export default function PostsIndex({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { rows } = data;

  return (
    <AdminChrome
      title="文章"
      section="/admin/posts"
      action={
        <Link href="/admin/posts/new" className={buttonClass}>
          写新的
        </Link>
      }
    >
      <PostsList rows={rows} />
    </AdminChrome>
  );
}
