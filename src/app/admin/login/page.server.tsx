export async function loadPageData(input: PageProps<"/admin/login">) {
  const { searchParams } = input;
  const { next } = await searchParams;
  return { next };
}

export async function generateMetadata(_input: PageProps<"/admin/login">) {
  return {};
}
