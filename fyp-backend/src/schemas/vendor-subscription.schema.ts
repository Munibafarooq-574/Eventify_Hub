// fyp-backend/src/schemas/vendor-subscription.schema.ts

import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

import {
  PaymentProvider,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../vendor/growth/subscription/subscription.types';

@Schema({
  timestamps: true,
})
export class VendorSubscription extends Document {
  
  @Prop({
    type:
      MongooseSchema.Types.ObjectId,

    ref:
      'User',

    required:
      true,

    index:
      true,
  })
  vendorId:
    Types.ObjectId;


  @Prop({
    type:
      String,

    enum:
      SubscriptionPlan,

    required:
      true,

    default:
      SubscriptionPlan.BASIC,
  })
  plan:
    SubscriptionPlan;

  @Prop({
    type:
      String,

    enum:
      SubscriptionStatus,

    required:
      true,

    default:
      SubscriptionStatus.TRIAL,
  })
  status:
    SubscriptionStatus;

  
  @Prop({
    type:
      Date,

    required:
      true,

    default:
      () => new Date(),
  })
  startDate:
    Date;

  @Prop({
    type:
      Date,

    default:
      null,
  })
  endDate:
    Date | null;

  @Prop({
    type:
      String,

    enum:
      PaymentStatus,

    required:
      true,

    default:
      PaymentStatus.NONE,

    index:
      true,
  })
  paymentStatus:
    PaymentStatus;

  @Prop({
    type:
      String,

    enum:
      PaymentProvider,

    required:
      true,

    default:
      PaymentProvider.NONE,
  })
  paymentProvider:
    PaymentProvider;

  @Prop({
    type:
      String,

    trim:
      true,

    default:
      null,
  })
  paymentReference:
    string | null;

 
  @Prop({
    type:
      Number,

    min:
      0,

    default:
      0,
  })
  amountDue:
    number;

  @Prop({
    type:
      Number,

    min:
      0,

    default:
      0,
  })
  amountPaid:
    number;

  @Prop({
    type:
      Date,

    default:
      null,
  })
  paymentSubmittedAt:
    Date | null;

  @Prop({
    type:
      Date,

    default:
      null,
  })
  verifiedAt:
    Date | null;

  @Prop({
    type:
      MongooseSchema.Types.ObjectId,

    ref:
      'User',

    default:
      null,
  })
  verifiedBy:
    Types.ObjectId | null;

  @Prop({
    type:
      String,

    trim:
      true,

    default:
      null,
  })
  rejectionReason:
    string | null;

  @Prop({
    type:
      Boolean,

    default:
      true,

    index:
      true,
  })
  isCurrent:
    boolean;

  @Prop({
    type:
      String,

    trim:
      true,

    default:
      null,
  })
  cancelledReason:
    string | null;
}


export const VendorSubscriptionSchema =
  SchemaFactory.createForClass(
    VendorSubscription,
  );

VendorSubscriptionSchema.index({
  vendorId:
    1,

  isCurrent:
    1,
});

VendorSubscriptionSchema.index({
  vendorId:
    1,

  paymentStatus:
    1,
});

VendorSubscriptionSchema.index({
  paymentStatus:
    1,

  createdAt:
    -1,
});

VendorSubscriptionSchema.index({
  plan:
    1,

  status:
    1,
});

VendorSubscriptionSchema.index(
  {
    vendorId:
      1,

    paymentStatus:
      1,
  },
  {
    unique:
      true,

    partialFilterExpression: {
      paymentStatus:
        PaymentStatus.PENDING,
    },
  },
);