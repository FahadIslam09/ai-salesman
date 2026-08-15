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

export async function replyToComment(pageAccessToken: string, commentId: string, text: string): Promise<void> {
  await axios.post(
    `${GRAPH}/${commentId}/comments`,
    { message: text },
    { params: { access_token: pageAccessToken } }
  );
}

export async function sendPrivateReply(pageAccessToken: string, commentId: string, text: string): Promise<void> {
  await axios.post(
    `${GRAPH}/${commentId}/private_replies`,
    { message: text },
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
