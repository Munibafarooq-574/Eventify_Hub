// fyp-backend/src/payout/payout.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorOrder, VendorOrderSchema } from 'src/schemas/vendor-order.schema';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import { Payout, PayoutSchema } from 'src/schemas/payout.schema';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Payout.name, schema: PayoutSchema },
        ]),
    ],
    controllers: [PayoutController],
    providers: [PayoutService],
    exports: [PayoutService],
})
export class PayoutModule {}