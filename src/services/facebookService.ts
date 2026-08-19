import axios from "axios";
import { env } from "../config/env";

const GRAPH = `https://graph.facebook.com/${env.graphApiVersion}`;

export async function sendMessage(pageAccessToken: string, psid: string, text: string): Promise<void> {
  await axios.post(
    `${GRAPH}/me/messages`,
    { recipient: { id: psid }, message: { text } },
    { params: { access_token: pageAccessToken } }
  );
}

export async function sendImage(pageAccessToken: string, psid: string, url: string): Promise<void> {
  // Download ourselves and upload to Facebook as an attachment: sending a raw
  // URL makes Facebook fetch it, which times out on slow hosts (ImgBB → #-2).
  let dl;
  try {
    dl = await downloadAttachment(url);
  } catch (err: any) {
    // Retry once after a brief delay if host returned 502/timeout
    await new Promise((r) => setTimeout(r, 800));
    try {
      dl = await downloadAttachment(url);
    } catch {
      // Fallback: send direct URL to Facebook Graph API as last resort
      await axios.post(
        `${GRAPH}/me/messages`,
        { recipient: { id: psid }, message: { attachment: { type: "image", payload: { url, is_reusable: false } } } },
        { params: { access_token: pageAccessToken } }
      );
      return;
    }
  }

  const form = new FormData();
  form.append("message", JSON.stringify({ attachment: { type: "image", payload: { is_reusable: false } } }));
  form.append("filedata", new Blob([new Uint8Array(dl.data)], { type: dl.contentType }), "image.jpg");

  const uploadRes = await fetch(
    `${GRAPH}/me/message_attachments?access_token=${encodeURIComponent(pageAccessToken)}`,
    { method: "POST", body: form }
  );
  const uploadData: any = await uploadRes.json();
  const attachmentId: string | undefined = uploadData?.attachment_id;
  if (!attachmentId) {
    throw new Error(`attachment upload failed: ${JSON.stringify(uploadData)}`);
  }

  await axios.post(
    `${GRAPH}/me/messages`,
    { recipient: { id: psid }, message: { attachment: { type: "image", payload: { attachment_id: attachmentId } } } },
    { params: { access_token: pageAccessToken } }
  );
}

export async function replyToComment(pageAccessToken: string, commentId: string, text: string): Promise<void> {
  await axios.post(
    `${GRAPH}/${commentId}/comments`,
    { message: text },
    { params: { access_token: pageAccessToken } }
  );
}

export async function sendPrivateReply(pageAccessToken: string, commentId: string, text: string): Promise<void> {
  await axios.post(
    `${GRAPH}/me/messages`,
    { recipient: { comment_id: commentId }, message: { text } },
    { params: { access_token: pageAccessToken } }
  );
}

export async function getUserProfile(
  pageAccessToken: string,
  psid: string
): Promise<{ name?: string; profilePicUrl?: string }> {
  try {
    const { data } = await axios.get(`${GRAPH}/${psid}`, {
      params: { fields: "name,picture", access_token: pageAccessToken },
    });
    return { name: data?.name, profilePicUrl: data?.picture?.data?.url };
  } catch {
    return {};
  }
}

export async function downloadAttachment(url: string): Promise<{ data: Buffer; contentType: string }> {
  const { data, headers } = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  return { data: Buffer.from(data), contentType: String(headers["content-type"] ?? "image/jpeg") };
}

export async function getPost(
  pageAccessToken: string,
  postId: string
): Promise<{ message?: string; fullPicture?: string }> {
  try {
    const { data } = await axios.get(`${GRAPH}/${postId}`, {
      params: { fields: "message,full_picture", access_token: pageAccessToken },
    });
    return { message: data?.message, fullPicture: data?.full_picture };
  } catch {
    return {};
  }
}
