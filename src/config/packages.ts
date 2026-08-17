export interface CreditPackage {
  id: string;
  name: string;
  priceBdt: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", name: "Starter", priceBdt: 199, baseCredits: 10000, bonusCredits: 3000, totalCredits: 13000 },
  { id: "growth", name: "Growth", priceBdt: 499, baseCredits: 25000, bonusCredits: 7500, totalCredits: 32500 },
  { id: "pro", name: "Pro", priceBdt: 999, baseCredits: 50000, bonusCredits: 15000, totalCredits: 65000 },
  { id: "business", name: "Business", priceBdt: 1999, baseCredits: 100000, bonusCredits: 35000, totalCredits: 135000 },
  { id: "enterprise", name: "Enterprise", priceBdt: 4999, baseCredits: 250000, bonusCredits: 100000, totalCredits: 350000 },
];

export function getPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
