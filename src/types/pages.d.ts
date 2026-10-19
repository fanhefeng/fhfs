type PathParams<S extends string> = S extends `${string}[${infer Key}]${infer Rest}`
  ? { [K in Key | keyof PathParams<Rest>]: string }
  : {};
type PageProps<Path extends string> = {
  params: PathParams<Path>;
  searchParams: Record<string, string | string[] | undefined>;
};
