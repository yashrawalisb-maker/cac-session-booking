const DRIVE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([^/]+)/, // .../file/d/<id>/view
  /drive\.google\.com\/open\?id=([^&]+)/, // .../open?id=<id>
  /drive\.google\.com\/uc\?.*[?&]id=([^&]+)/, // .../uc?id=<id>
];

/**
 * Google Drive "share" links point to an HTML viewer page, not the image
 * bytes, so <img src> can't load them directly. Rewrite the common share-link
 * shapes to Drive's thumbnail endpoint, which serves the actual image for any
 * file set to "Anyone with the link".
 */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  for (const pattern of DRIVE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }
  return trimmed;
}
