import axios from "axios";
import { env } from "../config/env";

// Uploads a base64 image (optionally a data: URL) to ImgBB and returns the
// public image URL.
export async function uploadImage(base64: string): Promise<string> {
  if (!env.imgbbApiKey) throw new Error("IMGBB_API_KEY is not configured");
  const image = base64.replace(/^data:image\/[\w.+-]+;base64,/, "");
  const form = new URLSearchParams();
  form.append("key", env.imgbbApiKey);
  form.append("image", image);
  const { data } = await axios.post("https://api.imgbb.com/1/upload", form, {
    timeout: 30_000,
  });
  if (!data?.data?.url) {
    throw new Error(data?.error?.message ?? "ImgBB returned no URL");
  }
  return data.data.url;
}
