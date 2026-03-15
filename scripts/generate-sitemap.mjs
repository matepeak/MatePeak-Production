import fs from "node:fs/promises";
import path from "node:path";

const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.matepeak.com";

const staticRoutes = [
  "/",
  "/explore",
  "/mentors",
  "/how-it-works",
  "/about-us",
  "/student/signup",
  "/mentor/signup",
  "/student/login",
  "/expert/login",
];

function isoDate(value) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function fetchMentorUrls() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[sitemap] Supabase env vars missing. Generating static sitemap only.");
    return [];
  }

  const endpoint = `${supabaseUrl}/rest/v1/expert_profiles?select=username,updated_at,onboarding_complete&onboarding_complete=eq.true&username=not.is.null`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    console.warn(`[sitemap] Failed to fetch mentor URLs (${response.status}). Generating static sitemap only.`);
    return [];
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => typeof row.username === "string" && row.username.trim().length > 0)
    .map((row) => ({
      loc: `${siteUrl}/mentor/${encodeURIComponent(row.username)}`,
      lastmod: isoDate(row.updated_at),
    }));
}

function renderUrl(loc, lastmod) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
}

async function generate() {
  const now = new Date().toISOString();
  const mentorUrls = await fetchMentorUrls();

  const staticUrlEntries = staticRoutes.map((route) => ({
    loc: `${siteUrl}${route}`,
    lastmod: now,
  }));

  const allUrls = [...staticUrlEntries, ...mentorUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls
    .map((url) => renderUrl(url.loc, url.lastmod))
    .join("\n")}\n</urlset>\n`;

  const outputPath = path.resolve(process.cwd(), "public", "sitemap.xml");
  await fs.writeFile(outputPath, xml, "utf8");
  console.log(`[sitemap] Generated ${allUrls.length} URLs at public/sitemap.xml`);
}

generate().catch((error) => {
  console.error("[sitemap] Generation failed:", error);
  process.exitCode = 1;
});
