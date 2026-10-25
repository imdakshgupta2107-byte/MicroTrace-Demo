// storage — Supabase Storage for container/bottle photos, with graceful
// no-op when cloud is not configured. Bucket: "lab-photos" (public).
import { supabase, hasCloud } from "./supabase";
import { uid } from "./utils";

const BUCKET = "lab-photos";

export async function uploadPhoto(file: File | Blob, hint = "photo"): Promise<string | null> {
  if (!hasCloud || !supabase) return null;
  const name = `${hint}-${uid()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(name, file, {
    contentType: (file as File).type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("Upload: " + error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

export async function removePhoto(urlOrPath: string): Promise<void> {
  if (!hasCloud || !supabase) return;
  const ix = urlOrPath.lastIndexOf("/");
  const path = ix >= 0 ? urlOrPath.slice(ix + 1) : urlOrPath;
  await supabase.storage.from(BUCKET).remove([path]);
}
