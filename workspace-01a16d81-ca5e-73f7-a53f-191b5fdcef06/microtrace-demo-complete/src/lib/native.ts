// native — Capacitor Share + Filesystem with graceful web fallbacks.
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const isNative = (): boolean => Capacitor.isNativePlatform();

async function blobToBase64(b: Blob): Promise<string> {
  const buf = await b.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** save a Blob; native → app cache + share sheet, web → classic download */
export async function saveBlob(filename: string, blob: Blob): Promise<void> {
  if (isNative()) {
    const data = await blobToBase64(blob);
    const res = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, recursive: true });
    try {
      await Share.share({ title: filename, url: res.uri, dialogTitle: "Share / open file" });
    } catch { /* user dismissed share sheet — file remains in app cache */ }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** share plain text (WhatsApp picker on mobile / Web Share API) */
export async function shareText(text: string, fallbackUrl?: string): Promise<void> {
  try {
    if (isNative() || "share" in navigator) {
      await Share.share({ text, url: fallbackUrl, dialogTitle: "Share via…" });
      return;
    }
  } catch { /* fall through to copy */ }
  await navigator.clipboard?.writeText(text).catch(() => undefined);
}
