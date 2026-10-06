// fyp-backend/src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorOrder, VendorOrderSchema } from 'src/schemas/vendor-order.schema';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PayoutModule } from 'src/payout/payout.module';
import { AuthModule } from 'src/auth/auth.module';
import {
  PaymentVerificationController,
} from './payment-verification.controller';
import {
  User,
  UserSchema,
} from 'src/schemas/user.schema';

import { EmailModule } from 'src/email/email.module';

@Module({
    imports: [
    MongooseModule.forFeature([
  {
    name: VendorOrder.name,
    schema: VendorOrderSchema,
  },

  {
    name: Order.name,
    schema: OrderSchema,
  },

  {
    name: Payment.name,
    schema: PaymentSchema,
  },

  {
    name: User.name,
    schema: UserSchema,
  },
]),
    PayoutModule,
    AuthModule,
    EmailModule,
],
    controllers: [
    PaymentController,
    PaymentVerificationController,
],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}