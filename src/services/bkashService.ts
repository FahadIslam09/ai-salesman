import axios from "axios";
import { env } from "../config/env";

// ponytail: one cached id_token (expires ~1h); refresh on expiry.
let cachedToken: { idToken: string; expiresAt: number } | null = null;

export function bkashConfigured(): boolean {
  return !!(
    env.bkash.baseUrl &&
    env.bkash.username &&
    env.bkash.password &&
    env.bkash.appKey &&
    env.bkash.appSecret
  );
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.idToken;
  const { data } = await axios.post(
    `${env.bkash.baseUrl}/tokenized/checkout/token/grant`,
    { app_key: env.bkash.appKey, app_secret: env.bkash.appSecret },
    {
      headers: {
        username: env.bkash.username,
        password: env.bkash.password,
        "Content-Type": "application/json",
      },
    }
  );
  if (!data?.id_token) throw new Error("bKash token grant failed");
  cachedToken = {
    idToken: data.id_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
  return data.id_token;
}

export interface BkashPayment {
  paymentID: string;
  bkashURL: string;
}

export async function createPayment(opts: {
  amount: number;
  invoice: string;
  payerReference?: string;
}): Promise<BkashPayment> {
  const idToken = await getToken();
  const { data } = await axios.post(
    `${env.bkash.baseUrl}/tokenized/checkout/create`,
    {
      mode: "0011",
      payerReference: opts.payerReference ?? "1",
      callbackURL: env.bkash.callbackUrl,
      amount: String(opts.amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: opts.invoice,
    },
    {
      headers: {
        Authorization: idToken,
        "X-App-Key": env.bkash.appKey,
        "Content-Type": "application/json",
      },
    }
  );
  if (!data?.paymentID || !data?.bkashURL) {
    throw new Error(`bKash create failed: ${data?.statusMessage ?? "unknown error"}`);
  }
  return { paymentID: data.paymentID, bkashURL: data.bkashURL };
}

export interface BkashExecution {
  trxID: string;
  amount: string;
}

export async function executePayment(paymentID: string): Promise<BkashExecution> {
  const idToken = await getToken();
  const { data } = await axios.post(
    `${env.bkash.baseUrl}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        Authorization: idToken,
        "X-App-Key": env.bkash.appKey,
        "Content-Type": "application/json",
      },
    }
  );
  if (data?.statusCode && data.statusCode !== "0000") {
    throw new Error(`bKash execute failed: ${data.statusMessage ?? data.statusCode}`);
  }
  if (!data?.trxID) throw new Error("bKash execute: no trxID returned");
  return { trxID: data.trxID, amount: data.amount };
}
