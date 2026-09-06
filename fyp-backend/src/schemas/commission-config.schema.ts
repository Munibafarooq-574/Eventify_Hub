// fyp-backend/src/schemas/commission-config.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CommissionConfig extends Document {
    // Default 0% — platform is commission-free by design.
    // Admin can raise this later; existing bookings are never retroactively
    // affected because we snapshot the rate at acceptance time.
    @Prop({ default: 0, min: 0, max: 100 })
    platformCommissionPercentage: number;
}

export const CommissionConfigSchema = SchemaFactory.createForClass(CommissionConfig);