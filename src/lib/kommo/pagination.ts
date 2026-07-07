/** Extrai path relativo (/leads?...) de um link `_links.next` da API Kommo. */
export function kommoPathFromNextLink(href: string): string | null {
  try {
    const url = new URL(href);
    const match = url.pathname.match(/\/api\/v4(\/.*)$/);
    if (match) return `${match[1]}${url.search}`;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
