// fyp-backend/src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorOrder, VendorOrderSchema } from 'src/schemas/vendor-order.schema';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Payment.name, schema: PaymentSchema },
        ]),
    ],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}