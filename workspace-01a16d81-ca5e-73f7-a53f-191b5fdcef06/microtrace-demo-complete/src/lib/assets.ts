/** Resolve bundled public assets for Vite subpaths and Capacitor's local server. */
export function assetUrl(filename: string): string {
  return `${import.meta.env.BASE_URL}${filename.replace(/^\/+/, "")}`;
}
