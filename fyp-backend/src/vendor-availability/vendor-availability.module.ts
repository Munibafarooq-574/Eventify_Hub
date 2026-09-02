//fyp-backend/src/vendor-availability/vendor-availability.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { VendorOrder, VendorOrderSchema } from 'src/schemas/vendor-order.schema';
import { VendorAvailabilityService } from './vendor-availability.service';
import { VendorAvailabilityController } from './vendor-availability.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: VendorOrder.name, schema: VendorOrderSchema },
    ]),
  ],
  controllers: [VendorAvailabilityController],
  providers: [VendorAvailabilityService],
  exports: [VendorAvailabilityService],
})
export class VendorAvailabilityModule {}