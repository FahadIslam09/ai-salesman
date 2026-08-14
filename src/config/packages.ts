export interface CreditPackage {
  id: string;
  name: string;
  priceBdt: number;
  credits: number;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", name: "Starter", priceBdt: 199, credits: 300 },
  { id: "basic", name: "Basic", priceBdt: 499, credits: 750 },
  { id: "business", name: "Business", priceBdt: 999, credits: 1700 },
  { id: "pro", name: "Pro", priceBdt: 1999, credits: 3700 },
  { id: "enterprise", name: "Enterprise", priceBdt: 4999, credits: 9500 },
];

export function getPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
