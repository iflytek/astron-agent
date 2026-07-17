export interface Reward {
  issue: string;
  payer: string;
  payee: string;
  currency: string;
  reward: number;
  source?: string;
}
