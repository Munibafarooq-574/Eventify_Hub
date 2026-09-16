// fyp-backend/src/vendor/growth/analytics/schemas/vendor-view-event.schema.ts
//
// EventifyHub has no view-tracking anywhere today (no `views` counter on
// User or on packages). The spec asks for "Most Viewed Package" and
// "Featured views" — both need *some* record of views to exist, or
// they'd have to be faked. This is the minimal thing that makes them
// real instead of invented: one document per view, recorded via
// POST /vendor/growth/analytics/track-view.
//
// This does NOT wire itself into anything — no customer screen calls it
// yet, since I don't have your VendorProfileDetailsScreen / package
// browsing screens' contents (same caution as every other unseen file
// in earlier phases). See PHASE_8_README.md for the one-line addition
// each of those screens needs, once you're ready (that's really a
// Phase 9 task). Until it's called anywhere, view-based metrics report
// as "not tracked yet" rather than a fake 0 — see analytics.service.ts.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: 'viewedAt', updatedAt: false } })
export class VendorViewEvent extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  vendorId: MongooseSchema.Types.ObjectId;

    @Prop({ type: String, default: null, index: true })
  packageId: string | null;

  // Traffic source: existing records without this field remain valid.
  @Prop({
    type: String,
    enum: ['organic', 'sponsored'],
    default: 'organic',
    index: true,
  })
  source: 'organic' | 'sponsored';

  viewedAt: Date;
}

export const VendorViewEventSchema = SchemaFactory.createForClass(VendorViewEvent);

VendorViewEventSchema.index({ vendorId: 1, packageId: 1, viewedAt: -1 });