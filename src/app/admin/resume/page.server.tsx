import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resumeExperiences, resumeProfiles } from "@/db/schema";
import { requireAdminPage } from "@/lib/server/auth/session";

export async function loadPageData(_input: PageProps<"/admin">) {
  await requireAdminPage();
  const [[profile], rows] = await Promise.all([
    db.select().from(resumeProfiles).where(eq(resumeProfiles.key, "main")).limit(1),
    db
      .select()
      .from(resumeExperiences)
      .orderBy(asc(resumeExperiences.sort), asc(resumeExperiences.key)),
  ]);
  return { profile, rows };
}

export async function generateMetadata(_input: PageProps<"/admin">) {
  return {};
}
