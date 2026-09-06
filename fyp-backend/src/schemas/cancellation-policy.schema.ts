// fyp-backend/src/schemas/cancellation-policy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Admin-configurable penalty tiers based on days-remaining-before-event.
// Single global config document (not per-vendor) — simplest starting point.
@Schema({ timestamps: true })
export class CancellationPolicyConfig extends Document {
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