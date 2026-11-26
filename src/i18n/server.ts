import "@tanstack/react-start/server-only";
import {
  createTranslator,
  createFormatter,
  type AbstractIntlMessages,
  type TranslationValues,
  type RichTranslationValues,
  type MarkupTranslationValues,
} from "use-intl/core";
import type { ReactNode } from "react";
import { getRequest } from "@tanstack/react-start/server";
import { getCopyOverrides } from "@/lib/server/content";
import { merge } from "@/lib/server/messages";
import { site } from "@/config/site";
import { routing } from "./routing";
function requestLocale() {
  return new URL(getRequest().url).pathname.split("/")[1] === "en" ? "en" : "zh";
}
export async function getDefaultMessages(locale: string): Promise<AbstractIntlMessages> {
  return locale === "en"
    ? (await import("../../messages/en.json")).default
    : (await import("../../messages/zh.json")).default;
}

export async function getMessages(locale: string = requestLocale()): Promise<AbstractIntlMessages> {
  const l = locale === "en" ? "en" : routing.defaultLocale;
  const catalogue = await getDefaultMessages(l);
  return merge(catalogue, await getCopyOverrides(l)) as AbstractIntlMessages;
}
type Translator = {
  (key: string, values?: TranslationValues): string;
  rich(key: string, values?: RichTranslationValues): ReactNode;
  markup(key: string, values?: MarkupTranslationValues): string;
  raw(key: string): unknown;
  has(key: string): boolean;
};
export async function getTranslations(
  options?: string | { locale?: string; namespace?: string },
): Promise<Translator> {
  const locale = typeof options === "object" && options.locale ? options.locale : requestLocale();
  const namespace = typeof options === "string" ? options : options?.namespace;
  return createTranslator({
    locale,
    namespace,
    messages: await getMessages(locale),
    timeZone: site.timeZone,
  }) as Translator;
}
export async function getFormatter() {
  return createFormatter({ locale: requestLocale(), timeZone: site.timeZone });
}
