import type { SeoSettings } from "../types/tenant";

const setMeta = (name: string, content: string, property = false) => {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(element);
  }

  element.content = content;
};

export function applySeo(settings: SeoSettings) {
  document.title = settings.title;
  setMeta("description", settings.description);
  setMeta("keywords", settings.keywords.join(", "));
  setMeta("robots", settings.robotsMode);
  setMeta("og:title", settings.title, true);
  setMeta("og:description", settings.description, true);
  setMeta("og:image", settings.ogImageUrl, true);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = settings.canonicalUrl;
}
