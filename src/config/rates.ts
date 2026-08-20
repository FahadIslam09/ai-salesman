// Pricing & billing configuration. The backend is the single source of truth
// for credit math — the frontend only displays what the API returns.

// Customer billing markup over actual provider cost (configurable via Super Admin).
let activeMarkupMultiplier = Number(process.env.MARKUP_MULTIPLIER ?? "4");

export function getMarkupMultiplier(): number {
  return activeMarkupMultiplier;
}

export function setMarkupMultiplier(multiplier: number) {
  if (multiplier > 0) {
    activeMarkupMultiplier = multiplier;
  }
}

// 1 credit = $0.0001 customer usage value.
export const CREDIT_VALUE_USD = 0.0001;

// Provider rates in "cents per 1M tokens" (integer or decimal precision).
export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "openai/gpt-5.6-luna": { input: 10, output: 60 },
  "google/gemini-2.5-flash-lite": { input: 10, output: 40 },
  "deepseek/deepseek-chat": { input: 7.65, output: 15.3 },
  "deepseek/deepseek-v4-flash-0731": { input: 7.65, output: 15.3 },
};

// Fixed-point: 1 credit = 1,000,000 micro-credits.
export const MICRO_PER_CREDIT = 1_000_000;

export function rateFor(model: string): { input: number; output: number } {
  return MODEL_RATES[model] ?? { input: 10, output: 60 };
}

export function providerFor(model: string): string {
  return model.split("/")[0] ?? "unknown";
}

// Actual provider cost in nano-USD (integer, 1e-9 USD).
// cost = (in*inCents + out*outCents) / 100 micro-USD = (...) * 10 nano-USD
export function costNanoUsd(model: string, tokensIn: number, tokensOut: number): number {
  const r = rateFor(model);
  return Math.round((tokensIn * r.input + tokensOut * r.output) * 10);
}

// Customer billable cost after the markup multiplier, in nano-USD.
export function billableNanoUsd(model: string, tokensIn: number, tokensOut: number): number {
  return Math.round(costNanoUsd(model, tokensIn, tokensOut) * getMarkupMultiplier());
}

// Credits consumed (in micro-credits) for a given model + token usage.
// microCredits = billableNanoUsd * 10  (1 credit = $1e-4 = 100,000 nano-USD)
export function usageMicroCredits(model: string, tokensIn: number, tokensOut: number): number {
  return Math.round(billableNanoUsd(model, tokensIn, tokensOut) * 10);
}

export function microToCredits(micro: number): number {
  return micro / MICRO_PER_CREDIT;
}

export interface UsageBill {
  model: string;
  provider: string;
  apiCostNanoUsd: number;
  markupMultiplier: number;
  billableCostNanoUsd: number;
  creditsUsed: number; // micro-credits
}

export function computeBill(model: string, tokensIn: number, tokensOut: number): UsageBill {
  const apiCost = costNanoUsd(model, tokensIn, tokensOut);
  const multiplier = getMarkupMultiplier();
  return {
    model,
    provider: providerFor(model),
    apiCostNanoUsd: apiCost,
    markupMultiplier: multiplier,
    billableCostNanoUsd: Math.round(apiCost * multiplier),
    creditsUsed: usageMicroCredits(model, tokensIn, tokensOut),
  };
}
