import type { Metadata } from "@/lib/metadata";
import { notFound } from "@/lib/navigation";
import { hasLocale } from "use-intl";
import { getTranslations } from "@/i18n/server";
import { routing } from "@/i18n/routing";
import { pageLocale } from "@/i18n/page";
import { localeAlternates } from "@/lib/server/seo";
import { labEntry, type LabEntry } from "@/components/lab/entries";
import { GROVE_PALETTE_KEYS, GROVE_PALETTES } from "@/lib/grove/palettes";

import { LENS_SLIDES } from "@/components/lab/lensSlides";
import type { StillItem } from "@/components/films/FilmStills";
import { statueStandIn } from "@/components/idols/statue";
import { asset } from "@/lib/asset";
import type { FilmRatio } from "@/lib/films";
import { STATUE_IDOL } from "@/lib/idols";
import { inLocale } from "@/lib/localized";
import { type StudyText } from "@/components/lab/LabStudy";
import type { ChangelogEntry } from "@/components/about/Changelog";
import { getFilm, getIdol, getTimeline } from "@/lib/server/content";
import { groveCards } from "@/components/grove/cards";
import type { GroveCardData } from "@/components/grove/GroveCard";
const STUDY_KEYS: Record<LabEntry["key"], string[]> = {
  magazine: [
    "label",
    "lede",
    "coverAria",
    "edition",
    "coverKicker",
    "coverTitle",
    "coverBody",
    "read",
    "save",
    "saved",
    "stageNote",
    "live",
    "fallback",
    "turnAria",
    "turnLeft",
    "turnRight",
    "reset",
    "flatView",
    "spatialView",
    "liveHint",
    "flatHint",
  ],
  hello: [
    "label",
    "lede",
    "hello",
    "nihao",
    "play",
    "pause",
    "playbackAria",
    "replay",
    "wordLabel",
    "speedLabel",
    "themeLabel",
    "paperAria",
    "peachAria",
    "blueAria",
    "nightAria",
    "guideLabel",
  ],
  scrollVideo: [
    "loading",
    "failed",
    "captionOne",
    "captionOneBody",
    "captionTwo",
    "captionTwoBody",
  ],
  dissolve: ["headline", "body", "tail", "fallback", "saveData"],
  meltingText: ["label", "replay", "sample"],
  // The spec table is not here: the page renders it itself, below, and what
  // is listed here is serialized into the study's props.
  grove: [
    "headline",
    "body",
    "tail",
    "fallback",
    "saveData",
    "stageScan",
    "stageGrow",
    "stageSettle",
    "dressLegend",
    // One name per dress, by the message key the palette table carries.
    ...GROVE_PALETTE_KEYS.map((k) => GROVE_PALETTES[k].label),
  ],
  liquidMetal: [
    "headline",
    "body",
    "tail",
    "fallback",
    "label",
    "stageField",
    "stageMolten",
    "stageBloom",
  ],
  workstation: ["deskHint", "deskAria", "turnLeft", "turnRight", "deskSaveData", "deskFallback"],
  lensSlider: [
    "fallback",
    "saveData",
    "counterAria",
    "prev",
    "next",
    ...LENS_SLIDES.flatMap((name) => [`${name}Alt`, `${name}Title`, `${name}Body`, `${name}Meta`]),
  ],
  // The stills' captions and rights line are the La La Land room's, set below.
  neon: ["welcome", "signOn", "galleryKicker", "galleryTitle", "galleryLede", "credit"],
  sideways: ["lead", "lineOne", "lineTwo", "lineThree", "tail"],
  masthead: ["label", "replay", "lineOne", "lineTwo"],
  reveal: ["label", "replay", "itemOne", "itemTwo", "itemThree", "itemFour", "itemFive"],
  headline: ["label", "replay", "title"],
  unmask: ["label", "replay", "title"],
  magnetic: ["label", "weak", "medium", "strong", "reachNote", "touchNote"],
  glint: ["label", "cardKicker", "cardTitle", "cardBody", "touchNote"],
  dieCut: ["label", "sample"],
  stickerWall: ["label", "wallTitle", "wallHint", "wallAria"],
  peel: ["label", "peelHint", "peelAria", "secret"],
  scatter: ["label", "pointerHint", "text", "touchNote"],
  dotName: ["label", "pointerHint", "text", "touchNote"],
  // The kicker carries the study's own ordinal, filled in below.
  approach: ["lede", "title", "linkLabel"],
  segmented: ["label", "ariaLabel", "all", "writing", "software", "lab", "selected", "keyNote"],
  // The two readouts carry the demo's own placeholders; set below, raw.
  reshuffle: [
    "label",
    "lede",
    "filterName",
    "ariaLabel",
    "all",
    "round",
    "square",
    "line",
    "motionName",
    "motionAria",
    "motionSite",
    "motionSlow",
    "motionNone",
    "readoutIdle",
    "gridNote",
  ],
  // The shell, one piece per study; the hrefs and the share title are set below.
  lights: ["label", "body"],
  readingChip: ["label", "body"],
  radialFan: ["label", "body"],
  overture: ["label", "body", "action", "reducedNote"],
  door: ["label", "body", "action"],
  veil: ["label", "body", "action"],
  island: ["label", "body"],
  // The stage's own labels are the idols room's, set below.
  statue: [
    "label",
    "lede",
    "viewName",
    "viewAria",
    "viewBronze",
    "viewWire",
    "frameLabel",
    "stateDrawing",
    "stateIdle",
    "frameNote",
  ],
  changelog: ["lede"],
  screening: ["lede"],
};

export async function loadPageData(input: PageProps<"/[locale]/lab/[slug]">) {
  const { params } = input;
  const locale = await pageLocale(params);
  const { slug } = await params;
  const entry = labEntry(slug);
  if (!entry) notFound();
  const t = await getTranslations({ locale: input.params.locale, namespace: "lab" });
  const ns = `items.${entry.key}` as const;
  const text: StudyText = { hint: t("hint") };
  for (const key of STUDY_KEYS[entry.key]) {
    text[key] = t(`${ns}.${key}`);
  }
  let entries: ChangelogEntry[] | undefined;
  let cards: [GroveCardData, GroveCardData] | undefined;
  if (entry.slug === "approach") {
    cards = await groveCards(locale);
    Object.assign(text, {
      kicker: t(`${ns}.kicker`, { ordinal: entry.ordinal }),
      linkHref: `/${locale}/lab/grove`,
    });
  }
  let wall: { ratio: FilmRatio; stills: StillItem[] } | undefined;
  if (entry.slug === "screening" || entry.slug === "neon") {
    const row = await getFilm(entry.slug === "screening" ? "odyssey" : "lala");
    const film = row ? inLocale(row, locale) : null;
    wall = {
      ratio: film?.ratio ?? "video",
      stills: (film?.stills ?? []).map((still) => ({ ...still, src: asset(still.src) })),
    };
    if (entry.slug === "screening") {
      text.credit = film?.credit ?? "";
      const tf = await getTranslations({ locale: input.params.locale, namespace: "films" });
      Object.assign(text, {
        open: tf("viewer.open"),
        close: tf("viewer.close"),
        prev: tf("viewer.prev"),
        next: tf("viewer.next"),
        // Raw: the placeholders are the viewer's to fill, not ICU's.
        counter: tf.raw("viewer.counter"),
        viewerHint: tf("viewer.hint"),
      });
    } else {
      // The sign keeps its own credit (the lettering's); the stills' is the room's.
      text.stillsCredit = film?.credit ?? "";
    }
  }
  let standIn: { src: string; width: number; height: number } | undefined;
  if (entry.slug === "statue") {
    const tk = await getTranslations({ locale: input.params.locale, namespace: "idols.kobe" });
    const idol = await getIdol(STATUE_IDOL);
    standIn = statueStandIn();
    Object.assign(text, {
      dragHint: tk("statueHint"),
      loading: tk("loading"),
      fallback: tk("statueFallback"),
      coverAlt: tk("statueAlt"),
      turnLeft: tk("turnLeft"),
      turnRight: tk("turnRight"),
      credit: idol ? inLocale(idol.credit, locale) : "",
    });
  }
  if (entry.slug === "reshuffle") {
    text.readout = String(t.raw(`${ns}.readout`));
    text.readoutNone = String(t.raw(`${ns}.readoutNone`));
  }
  if (entry.slug === "door") text.homeHref = `/${locale}`;
  if (entry.slug === "radial-fan") text.shareTitle = t(`${ns}.name`);
  if (entry.slug === "changelog") {
    text.title = t(`${ns}.title`);
    text.ariaLabel = t(`${ns}.listAria`);
    entries = inLocale(await getTimeline(), locale).map((row) => {
      const dateText = row.date ?? (row.dateLabel || "—");
      return {
        id: row.key,
        label: `fhf ${row.version}`,
        year: row.date ? row.date.slice(0, 4) : "—",
        date: { text: dateText, aria: t(`${ns}.dotAria`, { date: dateText }) },
        title: row.title,
        note: row.note,
      };
    });
  }
  return { locale, slug, entry, ns, text, entries, cards, wall, standIn };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/lab/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const entry = labEntry(slug);
  if (!entry) return {};
  const t = await getTranslations({ locale, namespace: "lab" });
  return {
    title: t(`items.${entry.key}.name`),
    description: t(`items.${entry.key}.summary`),
    alternates: localeAlternates(`/lab/${slug}`, locale),
  };
}
