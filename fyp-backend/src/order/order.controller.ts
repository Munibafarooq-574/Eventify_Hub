
//fyp-backend/src/order/order.controller.ts
import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Delete,
  Query,
  HttpException,
  InternalServerErrorException,
  BadRequestException,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { OrderService } from "./order.service";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

      @Post()
@UseGuards(JwtAuthGuard)
async placeOrder(
  @Request() req: any,
  @Body() body: {
    organizerId?: string;
    eventId: string;
    eventDate: string;
    eventTime: string;
    eventName: string;
    eventType?: string;
    guests: number;
    eventCityId: string;
    eventAddress: string;
    selectedCategoryIds?: string[];
    services: {
    vendorId: string;
    serviceName: string;
    price: number;
    packageId: string;
    durationMinutes?: number;
    quantity?: number;
    requiredServiceWindow?: {
        startDateTime: string;
        endDateTime: string;
    };
    promotion?: {
    promotionId: string;
    promotionType: 'COUPON' | 'DISCOUNT_CODE';
    promotionCode: string;
};
}[];
    durationMinutes?: number;
}) {
        try {
            const authenticatedOrganizerId =
                req.user?.id?.toString();

            if (!authenticatedOrganizerId) {
                throw new ForbiddenException(
                    'Authenticated organizer is required',
                );
            }

            if (
                req.user?.role?.toString().toLowerCase() !==
                'client'
            ) {
                throw new ForbiddenException(
                    'Only Client accounts can create bookings',
                );
            }

            if (
                body.organizerId &&
                body.organizerId !== authenticatedOrganizerId
            ) {
                throw new ForbiddenException(
                    'Organizer does not own this booking request',
                );
            }

            console.log(body.eventName, body.services)
            // JWT identity is the final organizer authority.
            const order = await this.orderService.createOrder(
                authenticatedOrganizerId,
                new Date(body.eventDate),
                body.eventTime,
                body.services,
                body.eventName,
                body.guests,
                body.eventType,
                body.durationMinutes,
                body.eventCityId,
                body.eventAddress,
                body.selectedCategoryIds,
                body.eventId,
            );
            
            return order;
                } catch (error) {
            console.error('Error placing order:', error);


            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to place order');
        }
    }

    @Patch('vendor-response/:id')
    async respondToOrder(
        @Param('id') vendorOrderId: string,
        @Body() body: { status: 'accepted' | 'rejected'; message?: string },
    ) {
        return this.orderService.updateVendorResponse(vendorOrderId, body.status, body.message);
    }

    @Patch('vendor-order/:id/status')
async updateVendorOrderStatus(
    @Param('id') vendorOrderId: string,
    @Body()
    body: {
        status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    },
) {
    return this.orderService.updateVendorOrderStatus(
        vendorOrderId,
        body.status,
    );
}

    @Patch('complete-vendor/:id')
    async completeVendor(@Param('id') vendorOrderId: string) {
        return this.orderService.completeVendorOrder(vendorOrderId);
    }

        // NEW (Phase 4): organizer cancels a still-pending (REQUESTED) item
    @Patch('vendor-order/:id/cancel-request')
    async cancelRequest(
        @Param('id') vendorOrderId: string,
        @Body() body: { reason?: string },
    ) {
        return this.orderService.cancelVendorOrderByOrganizer(
            vendorOrderId,
            body?.reason,
        );
    }

    @Patch('complete-order/:id')
    async completeOrder(@Param('id') orderId: string) {
        return this.orderService.confirmOrderCompletion(orderId);
    }

    @Patch(':id/status')
    updateOrderStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateStatus(id, dto);
    }

        // NEW (Phase 5 scaffold): manual trigger for now;
    // wire to a cron in Phase 6
    @Post('vendor-order/expire-stale-holds')
    async expireStaleHolds() {
        return this.orderService.expireStaleHolds();
    }
    // Get all orders with status filtering and userId
    @Get()
    async getOrders(
        @Query('type') type: string,
        @Query('userId') userId: string,  // Add userId parameter
        @Query('status') status?: string,
        @Query('limit') limit = 10,
        @Query('skip') skip = 0,
    ) {
        const orders = await this.orderService.getOrders(type, userId, status, limit, skip);  // Pass userId to service
        console.log(orders);
        return orders;
    }


    // Get order stats (pending, processing, completed)
    @Get('stats')
async getOrderStats(
  @Query('type') type: string,
  @Query('userId') userId: string,
) {
  if (!type) {
    throw new BadRequestException('type is required');
  }

  if (!userId) {
    throw new BadRequestException('userId is required');
  }

  return this.orderService.getOrderStats(type, userId);
}

    @Get('stats/monthly')
    async getMonthlyOrderStats(@Query('vendorId') vendorId: string) {
        return this.orderService.getOrderStatsForVendor(vendorId);
    }

    // Delete an order
    @Delete(':id')
    async deleteOrder(@Param('id') orderId: string) {
        return this.orderService.deleteOrder(orderId);
    }
}