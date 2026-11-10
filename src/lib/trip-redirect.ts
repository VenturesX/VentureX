/** Browser destinations the guest page may follow from an /api/trip response. */
export function tripRedirectHref(href: string | undefined): string | null {
  if (href === "/team") return href;
  if (!href) return null;
  try {
    if (new URL(href).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return href;
}
