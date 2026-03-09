import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SeoConfig = {
  title: string;
  description: string;
  robots: string;
  canonicalPath: string;
  image: string;
};

const SITE_URL = "https://bellytalkapp.com";
const DEFAULT_IMAGE = "/favicon.ico";

const DEFAULT_SEO: SeoConfig = {
  title: "BellyTalk - Maternal Health Platform",
  description:
    "BellyTalk is a maternal health platform for consultations, hospital discovery, secure chat, and wellness support.",
  robots: "index, follow, max-image-preview:large",
  canonicalPath: "/",
  image: DEFAULT_IMAGE,
};

const ROUTE_SEO: Record<string, Partial<SeoConfig>> = {
  "/": {
    title: "BellyTalk - Maternal Health Platform",
    description:
      "Find hospitals, connect with care teams, and manage maternal health with BellyTalk.",
    robots: "index, follow, max-image-preview:large",
    canonicalPath: "/",
  },
  "/login": {
    title: "Login - BellyTalk",
    description: "Sign in to your BellyTalk account.",
    robots: "noindex, nofollow",
    canonicalPath: "/login",
  },
  "/register": {
    title: "Register - BellyTalk",
    description:
      "Create a BellyTalk account to access maternal health services.",
    robots: "noindex, nofollow",
    canonicalPath: "/register",
  },
  "/unauthorized": {
    title: "Unauthorized - BellyTalk",
    description: "You do not have permission to access this page.",
    robots: "noindex, nofollow",
    canonicalPath: "/unauthorized",
  },
  "/dashboard": {
    title: "Dashboard - BellyTalk",
    description: "Your BellyTalk dashboard.",
    robots: "noindex, nofollow",
    canonicalPath: "/dashboard",
  },
  "/profile": {
    title: "Profile - BellyTalk",
    description: "Manage your BellyTalk profile and account settings.",
    robots: "noindex, nofollow",
    canonicalPath: "/profile",
  },
  "/hospitals": {
    title: "Hospitals - BellyTalk",
    description: "Browse and connect with hospitals on BellyTalk.",
    robots: "noindex, nofollow",
    canonicalPath: "/hospitals",
  },
  "/content": {
    title: "Health Content - BellyTalk",
    description: "Read educational maternal health content on BellyTalk.",
    robots: "noindex, nofollow",
    canonicalPath: "/content",
  },
  "/shop": {
    title: "Shop - BellyTalk",
    description: "Explore products designed for maternal wellness.",
    robots: "noindex, nofollow",
    canonicalPath: "/shop",
  },
};

function upsertMetaByName(name: string, content: string): void {
  let tag = document.head.querySelector(
    `meta[name="${name}"]`,
  ) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let tag = document.head.querySelector(
    `meta[property="${property}"]`,
  ) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function upsertCanonicalLink(url: string): void {
  let link = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

function upsertWebPageJsonLd(data: {
  name: string;
  description: string;
  url: string;
}): void {
  const scriptId = "bellytalk-page-jsonld";
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: data.name,
      description: data.description,
      url: data.url,
    },
    null,
    2,
  );
}

function resolveSeo(pathname: string): SeoConfig {
  const routeConfig = ROUTE_SEO[pathname] || {
    title: "BellyTalk",
    description: "BellyTalk maternal health platform.",
    robots: "noindex, nofollow",
    canonicalPath: pathname,
  };

  return {
    ...DEFAULT_SEO,
    ...routeConfig,
  };
}

function buildCanonicalUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function useSeoManager(): void {
  const location = useLocation();

  useEffect(() => {
    const seo = resolveSeo(location.pathname);
    const canonicalUrl = buildCanonicalUrl(seo.canonicalPath);

    document.title = seo.title;

    upsertMetaByName("description", seo.description);
    upsertMetaByName("robots", seo.robots);

    upsertMetaByProperty("og:title", seo.title);
    upsertMetaByProperty("og:description", seo.description);
    upsertMetaByProperty("og:url", canonicalUrl);
    upsertMetaByProperty("og:image", seo.image);

    upsertMetaByName("twitter:title", seo.title);
    upsertMetaByName("twitter:description", seo.description);
    upsertMetaByName("twitter:image", seo.image);
    upsertMetaByName("twitter:url", canonicalUrl);

    upsertCanonicalLink(canonicalUrl);
    upsertWebPageJsonLd({
      name: seo.title,
      description: seo.description,
      url: canonicalUrl,
    });
  }, [location.pathname]);
}
