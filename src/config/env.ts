import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  openrouterApiKey: required("OPENROUTER_API_KEY"),
  tokenSecret: required("TOKEN_SECRET"),
  verifyToken: required("VERIFY_TOKEN"),
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  dashboardUrl: process.env.DASHBOARD_URL ?? "http://localhost:3001",
  graphApiVersion: process.env.GRAPH_API_VERSION ?? "v23.0",
  bkash: {
    baseUrl: process.env.BKASH_BASE_URL ?? "",
    username: process.env.BKASH_USERNAME ?? "",
    password: process.env.BKASH_PASSWORD ?? "",
    appKey: process.env.BKASH_APP_KEY ?? "",
    appSecret: process.env.BKASH_APP_SECRET ?? "",
    callbackUrl: process.env.BKASH_CALLBACK_URL ?? "",
  },
};
