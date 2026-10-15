// fyp-backend/src/schemas/cancellation-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Embedded settings only: no additional model or collection.
@Schema({ _id: false })
export class CancellationPolicyTier {
    @Prop({ required: true, min: 0, max: 87600 })
    minHoursBeforeEvent: number;

    @Prop({ required: true, min: 0, max: 100 })
    percentage: number;
}
const TierSchema = SchemaFactory.createForClass(CancellationPolicyTier);

@Schema({ _id: false })
export class ClientRefundRules {
    @Prop({ type: [TierSchema], required: true })
    refundable: CancellationPolicyTier[];

    @Prop({ type: [TierSchema], required: true })
    partiallyRefundable: CancellationPolicyTier[];

    @Prop({ type: [TierSchema], required: true })
    nonRefundable: CancellationPolicyTier[];
}
const ClientRefundRulesSchema = SchemaFactory.createForClass(ClientRefundRules);

@Schema({ _id: false })
export class CancellationPolicySettings {
    @Prop({ type: ClientRefundRulesSchema, required: true })
    clientRefunds: ClientRefundRules;

    // Client protection is independent of package policy and vendor penalties.
    @Prop({ type: [TierSchema], required: true })
    vendorCausedClientRefunds: CancellationPolicyTier[];

    @Prop({ type: [TierSchema], required: true })
    vendorPenalties: CancellationPolicyTier[];

    @Prop({ required: true, min: 1, max: 8760 })
    paymentHoldHours: number;

    @Prop({ required: true, min: 1, max: 8760 })
    postServiceIssueWindowHours: number;
}
const PolicySettingsSchema = SchemaFactory.createForClass(CancellationPolicySettings);

// Admin-configurable penalty tiers based on days-remaining-before-event.
// Single global config document (not per-vendor) — simplest starting point.
@Schema({ timestamps: true })
export class CancellationPolicyConfig extends Document {
    // Prepared in Step 2. Runtime activation requires booking snapshots (Step 3).
    @Prop({ type: PolicySettingsSchema })
    policySettings?: CancellationPolicySettings;

    @Prop({ default: 0, min: 0 })
    policyRevision: number;

    // Legacy settings remain active until the snapshot/engine integration.
    // Vendor cancellation penalty tiers (percentage of vendor's price
    // withheld / counted against them as a penalty).
    @Prop({ default: 0 })
    penalty30PlusDays: number; // "No/low penalty"

    @Prop({ default: 10 })
    penalty15to29Days: number; // "Low penalty"

    @Prop({ default: 25 })
    penalty7to14Days: number; // "Medium"

    @Prop({ default: 50 })
    penaltyUnder7Days: number; // "High"

    @Prop({ default: 100 })
    penaltyEventDay: number; // "Severe"
}

export const CancellationPolicyConfigSchema = SchemaFactory.createForClass(
    CancellationPolicyConfig,
);