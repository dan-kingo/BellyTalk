export const getRenderableImageUrl = (url?: string | null): string => {
  if (!url) return "";

  const [baseUrl, query] = url.split("?");

  // Force Cloudinary to deliver a browser-friendly image format (e.g. webp/jpg from heic).
  if (baseUrl.includes("res.cloudinary.com") && baseUrl.includes("/upload/")) {
    const transformedBase = baseUrl.includes("/upload/f_auto,q_auto/")
      ? baseUrl
      : baseUrl.replace("/upload/", "/upload/f_auto,q_auto/");

    return query ? `${transformedBase}?${query}` : transformedBase;
  }

  return url;
};
