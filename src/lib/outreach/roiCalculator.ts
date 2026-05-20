export type RoiCalculatorInput = {
  missedCallsPerWeek: number;
  averageLeadValue: number;
  closeRate: number;
  monthlyCallVolume: number;
  currentResponseTimeMinutes: number;
  ottoservMonthlyCost: number;
  estimatedUsageMinutes: number;
  includedMinutes?: number;
  usageCostPerMinute?: number;
};

export type RoiCalculatorOutput = {
  monthlyMissedCalls: number;
  estimatedMissedRevenue: number;
  recoveredOpportunity: number;
  ottoservCostEstimate: number;
  roiMultiple: number;
  assumptions: string[];
};

export function calculateOttoServRoi(input: RoiCalculatorInput): RoiCalculatorOutput {
  const monthlyMissedCalls = Math.max(0, input.missedCallsPerWeek) * 4.33;
  const closeRate = normalizeRate(input.closeRate);
  const estimatedMissedRevenue = monthlyMissedCalls * Math.max(0, input.averageLeadValue) * closeRate;
  const responsePenalty = input.currentResponseTimeMinutes <= 5 ? 0.35 : input.currentResponseTimeMinutes <= 60 ? 0.5 : 0.65;
  const volumeRecoveryCap = Math.min(1, Math.max(0.15, input.monthlyCallVolume / Math.max(1, input.monthlyCallVolume + monthlyMissedCalls)));
  const recoveredOpportunity = estimatedMissedRevenue * responsePenalty * volumeRecoveryCap;
  const billableUsageMinutes = Math.max(0, input.estimatedUsageMinutes - (input.includedMinutes ?? 0));
  const usageBuffer = billableUsageMinutes * (input.usageCostPerMinute ?? 0);
  const ottoservCostEstimate = Math.max(0, input.ottoservMonthlyCost) + usageBuffer;
  const roiMultiple = ottoservCostEstimate > 0 ? recoveredOpportunity / ottoservCostEstimate : 0;

  return {
    monthlyMissedCalls: round(monthlyMissedCalls),
    estimatedMissedRevenue: round(estimatedMissedRevenue),
    recoveredOpportunity: round(recoveredOpportunity),
    ottoservCostEstimate: round(ottoservCostEstimate),
    roiMultiple: round(roiMultiple),
    assumptions: [
      "This is a planning estimate, not a guarantee.",
      "Close rate is applied only to missed-call opportunity.",
      "Recovered opportunity is discounted for response-time and volume realism.",
      "Usage-minute pricing is included only when includedMinutes and usageCostPerMinute are provided.",
    ],
  };
}

function normalizeRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  if (rate > 1) return Math.max(0, Math.min(100, rate)) / 100;
  return Math.max(0, Math.min(1, rate));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
