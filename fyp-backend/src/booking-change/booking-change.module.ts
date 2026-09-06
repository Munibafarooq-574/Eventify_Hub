// fyp-backend/src/booking-change/booking-change.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorOrder, VendorOrderSchema } from 'src/schemas/vendor-order.schema';
import { Order, OrderSchema } from 'src/schemas/order.schema';
import {
    BookingChangeRequest,
    BookingChangeRequestSchema,
} from 'src/schemas/booking-change-request.schema';
import { VendorAvailabilityModule } from 'src/vendor-availability/vendor-availability.module';
import { BookingChangeService } from './booking-change.service';
import { BookingChangeController } from './booking-change.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Order.name, schema: OrderSchema },
            { name: BookingChangeRequest.name, schema: BookingChangeRequestSchema },
        ]),
        VendorAvailabilityModule, // reuses existing checkVendorAvailability
    ],
    controllers: [BookingChangeController],
    providers: [BookingChangeService],
    exports: [BookingChangeService],
})
export class BookingChangeModule {}