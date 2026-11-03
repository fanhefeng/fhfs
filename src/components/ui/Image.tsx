import type { CSSProperties, ImgHTMLAttributes } from "react";
import responsiveImages from "@/lib/responsive-images.gen.json";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  fill?: boolean;
  preload?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
};

/** Native images retain intrinsic sizes and the existing lazy-loading gates. */
export default function Image({
  fill,
  preload,
  priority,
  quality: _quality,
  unoptimized,
  style,
  ...props
}: ImageProps) {
  const fillStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : {};
  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      style={{ ...fillStyle, ...style }}
      loading={preload || priority ? "eager" : (props.loading ?? "lazy")}
      srcSet={
        props.srcSet ??
        (unoptimized ? undefined : (responsiveImages as Record<string, string>)[props.src])
      }
      decoding={props.decoding ?? "async"}
      fetchPriority={preload || priority ? "high" : props.fetchPriority}
    />
  );
}
