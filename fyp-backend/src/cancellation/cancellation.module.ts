// fyp-backend/src/cancellation/cancellation.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorOrder, VendorOrderSchema } from 'src/schemas/vendor-order.schema';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';
import { Refund, RefundSchema } from 'src/schemas/refund.schema';
import { VendorPenalty, VendorPenaltySchema } from 'src/schemas/vendor-penalty.schema';
import {
    CancellationPolicyConfig,
    CancellationPolicyConfigSchema,
} from 'src/schemas/cancellation-policy.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { CancellationService } from './cancellation.service';
import { CancellationController } from './cancellation.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Payment.name, schema: PaymentSchema },
            { name: Refund.name, schema: RefundSchema },
            { name: VendorPenalty.name, schema: VendorPenaltySchema },
            {
                name: CancellationPolicyConfig.name,
                schema: CancellationPolicyConfigSchema,
            },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [CancellationController],
    providers: [CancellationService],
    exports: [CancellationService],
})
export class CancellationModule {}