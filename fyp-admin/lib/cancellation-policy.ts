export type PolicyTier = { minHoursBeforeEvent: number; percentage: number };
export type PolicySettings = {
  clientRefunds: { refundable: PolicyTier[]; partiallyRefundable: PolicyTier[]; nonRefundable: PolicyTier[] };
  vendorCausedClientRefunds: PolicyTier[];
  vendorPenalties: PolicyTier[];
  paymentHoldHours: number;
  postServiceIssueWindowHours: number;
};
export type PolicyConfig = { policyRevision: number; policySettings: PolicySettings };

export function readPolicy(data: PolicyConfig): PolicyConfig {
  const settings = data?.policySettings;
  const groups = [settings?.clientRefunds?.refundable, settings?.clientRefunds?.partiallyRefundable,
    settings?.clientRefunds?.nonRefundable, settings?.vendorCausedClientRefunds, settings?.vendorPenalties];
  if (!Number.isInteger(data?.policyRevision) || data.policyRevision < 0 || !settings ||
      ![settings.paymentHoldHours, settings.postServiceIssueWindowHours].every(value => Number.isInteger(value) && value >= 1 && value <= 8760) ||
      groups.some(tiers => !Array.isArray(tiers) || tiers.length < 1 || tiers.length > 20 || tiers[0].minHoursBeforeEvent !== 0 ||
        tiers.some((tier, index) => !Number.isInteger(tier.minHoursBeforeEvent) || tier.minHoursBeforeEvent < 0 || tier.minHoursBeforeEvent > 87600 ||
          !Number.isInteger(tier.percentage) || tier.percentage < 0 || tier.percentage > 100 ||
          (index > 0 && tier.minHoursBeforeEvent <= tiers[index - 1].minHoursBeforeEvent)))) {
    throw new Error("Policy settings are invalid or incomplete. Reload after the backend deployment finishes.");
  }
  return { policyRevision: data.policyRevision, policySettings: settings };
}
