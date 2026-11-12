import type { ComponentProps } from "react";
import { inputClass, textareaClass } from "./controls";

/** Labels, descriptions and validation remain attached to the native field. */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${className}`} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${textareaClass} ${className}`} />;
}
