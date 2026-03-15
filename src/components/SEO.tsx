import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  structuredData?: Record<string, any> | Array<Record<string, any>>;
}

const DEFAULT_SITE_URL = "https://www.matepeak.com";
const DEFAULT_IMAGE =
  "https://www.matepeak.com/lovable-uploads/14bf0eea-1bc9-4675-9231-356df10eb82d.png";

function upsertMetaByName(name: string, content: string) {
  let tag = document.head.querySelector(`meta[name=\"${name}\"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let tag = document.head.querySelector(`meta[property=\"${property}\"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector("link[rel=\"canonical\"]");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function upsertStructuredData(data: Record<string, any> | Array<Record<string, any>>) {
  const id = "matepeak-dynamic-structured-data";
  let script = document.getElementById(id) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}

export default function SEO({
  title,
  description,
  canonicalPath,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    const canonicalUrl = canonicalPath
      ? `${DEFAULT_SITE_URL}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`
      : window.location.href;

    document.title = title;

    upsertMetaByName("description", description);
    upsertMetaByName("robots", noindex ? "noindex, nofollow" : "index, follow");

    upsertCanonical(canonicalUrl);

    upsertMetaByProperty("og:type", type);
    upsertMetaByProperty("og:site_name", "MatePeak");
    upsertMetaByProperty("og:title", title);
    upsertMetaByProperty("og:description", description);
    upsertMetaByProperty("og:url", canonicalUrl);
    upsertMetaByProperty("og:image", image);

    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", title);
    upsertMetaByName("twitter:description", description);
    upsertMetaByName("twitter:image", image);

    if (structuredData) {
      upsertStructuredData(structuredData);
    }
  }, [title, description, canonicalPath, image, type, noindex, structuredData]);

  return null;
}
