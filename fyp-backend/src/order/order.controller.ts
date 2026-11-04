import { MarketplaceGuard } from '../city/marketplace.guard';

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
import { CreateRescheduleRequestDto, RespondRescheduleRequestDto, ResolveRescheduleRequestDto } from './dto/reschedule-request.dto';

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Post('vendor-order/:id/later-time-request')
    @UseGuards(JwtAuthGuard)
    requestLaterTime(@Param('id') id: string, @Request() req: any, @Body() body: any) {
        return this.orderService.requestLaterServiceTime(id, req.user, body);
    }

    @Get('vendor-order/:id/cancellation-replacement')
    @UseGuards(JwtAuthGuard)
    cancellationReplacement(@Param('id') id: string, @Request() req: any) {
        return this.orderService.getCancellationReplacementContext(id, req.user);
    }

    @Patch('vendor-order/:id/continue-without')
    @UseGuards(JwtAuthGuard)
    continueWithout(@Param('id') id: string, @Request() req: any) {
        return this.orderService.continueWithoutCancelledVendor(id, req.user);
    }

      @Post()
@UseGuards(JwtAuthGuard, MarketplaceGuard)
async placeOrder(
  @Request() req: any,
  @Body() body: {
    organizerId?: string;
    bookingDraftRevision?: number;
    eventId: string;
    eventDate: string;
    eventTime: string;
    eventName: string;
    eventType?: string;
    guests: number;
    eventCityId: string;
    eventAddress: string;
    selectedCategoryIds?: string[];
    replacementRescheduleRequestId?: string;
    replacementVendorOrderId?: string;
    services: {
    vendorId: string;
    serviceName: string;
    price: number;
    packageId: string;
    durationMinutes?: number;
    deliveryStartDateTime?: string;
        expectedDeliveryFee?: number;
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

            const authenticatedRole =
                req.user?.role
                    ?.toString()
                    .trim()
                    .toLowerCase();

            if (
                authenticatedRole !== 'client' &&
                authenticatedRole !== 'organizer'
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
                body.replacementRescheduleRequestId,
                body.replacementVendorOrderId,
                ...(body.bookingDraftRevision === undefined ? [] : [body.bookingDraftRevision] as const),
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
    @UseGuards(JwtAuthGuard)
    async respondToOrder(
        @Param('id') vendorOrderId: string,
        @Body() body: { status: 'accepted' | 'rejected'; message?: string },
        @Request() req: any,
    ) {
        await this.orderService.assertVendorBookingOwner(vendorOrderId, req.user);
        return this.orderService.updateVendorResponse(vendorOrderId, body.status, body.message);
    }

    @Patch('vendor-order/:id/status')
    @UseGuards(JwtAuthGuard)
async updateVendorOrderStatus(
    @Param('id') vendorOrderId: string,
    @Body()
    body: {
        status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    },
    @Request() req: any,
) {
    await this.orderService.assertVendorBookingOwner(vendorOrderId, req.user);
    return this.orderService.updateVendorOrderStatus(
        vendorOrderId,
        body.status,
    );
}

    @Patch('complete-vendor/:id')
    @UseGuards(JwtAuthGuard)
    async completeVendor(@Param('id') vendorOrderId: string, @Request() req: any) {
        await this.orderService.assertVendorBookingOwner(vendorOrderId, req.user);
        return this.orderService.completeVendorOrder(vendorOrderId);
    }

        // NEW (Phase 4): organizer cancels a still-pending (REQUESTED) item
    @Patch('vendor-order/:id/cancel-request')
    @UseGuards(JwtAuthGuard)
    async cancelRequest(
        @Param('id') vendorOrderId: string,
        @Body() body: { reason?: string },
        @Request() req: any,
    ) {
        return this.orderService.cancelVendorOrderByOrganizer(
            vendorOrderId,
            body?.reason,
            req.user,
        );
    }

    @Patch('complete-order/:id')
    @UseGuards(JwtAuthGuard)
    async completeOrder(@Param('id') orderId: string, @Request() req: any) {
        return this.orderService.confirmOrderCompletion(orderId, this.requireOrderAccount(req, undefined, 'Organizer'));
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
    private requireOrderAccount(req: any, requestedId: string | undefined, type: string) {
        const userId = req.user?.id?.toString();
        const role = req.user?.role?.trim().toLowerCase();
        const accountType = role === 'vendor' ? 'Vendor'
            : ['client', 'organizer'].includes(role) ? 'Organizer' : null;
        if (!userId || !accountType || type !== accountType || (requestedId && requestedId !== userId)) {
            throw new ForbiddenException('You can only access orders for your own account.');
        }
        return userId;
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getOrders(
        @Request() req: any,
        @Query('type') type: string,
        @Query('userId') userId?: string,
        @Query('status') status?: string,
        @Query('limit') limit = 10,
        @Query('skip') skip = 0,
    ) {
        return this.orderService.getOrders(type, this.requireOrderAccount(req, userId, type), status, limit, skip);
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    async getOrderStats(@Request() req: any, @Query('type') type: string, @Query('userId') userId?: string) {
        return this.orderService.getOrderStats(type, this.requireOrderAccount(req, userId, type));
    }

    @Get('stats/monthly')
    @UseGuards(JwtAuthGuard)
    async getMonthlyOrderStats(@Request() req: any, @Query('vendorId') vendorId?: string) {
        return this.orderService.getOrderStatsForVendor(this.requireOrderAccount(req, vendorId, 'Vendor'));
    }

    // Phase 13B — Client requests a date/time change.
    @Get(':id/delivery-context')
    @UseGuards(JwtAuthGuard)
    deliveryContext(@Param('id') id: string, @Request() req: any) {
        return this.orderService.getDeliveryRescheduleContext(id, req.user.id).then(({ bookings }) => bookings.map(b => ({ _id:b._id, serviceName:b.serviceName })));
    }

    @Post(':id/delivery-candidates')
    @UseGuards(JwtAuthGuard)
    rescheduleDeliveryCandidates(@Param('id') id: string, @Request() req: any, @Body() dto: any) {
        return this.orderService.getRescheduleDeliveryCandidates(id,req.user.id,dto);
    }

    @Post(':id/reschedule')
    @UseGuards(JwtAuthGuard)
    async requestReschedule(
        @Request() req: any,
        @Param('id') orderId: string,
        @Body() body: CreateRescheduleRequestDto,
    ) {
        return this.orderService.requestEventReschedule(
            orderId,
            req.user?.id?.toString(),
            body,
        );
    }

    // Client sees per-vendor states; vendor sees own requests.
    @Get('reschedule/requests')
    @UseGuards(JwtAuthGuard)
    async getRescheduleRequests(
        @Request() req: any,
        @Query('orderId') orderId?: string,
    ) {
        return this.orderService.getRescheduleRequests(
            req.user?.id?.toString(),
            req.user?.role,
            orderId,
        );
    }

    // Vendor independently accepts/rejects its own request.
    @Patch('reschedule/:requestId/respond')
    @UseGuards(JwtAuthGuard)
    async respondToReschedule(
        @Request() req: any,
        @Param('requestId') requestId: string,
        @Body() body: RespondRescheduleRequestDto,
    ) {
        const role = req.user?.role?.toString().trim().toLowerCase();
        if (role !== 'vendor') {
            throw new ForbiddenException('Only vendors can respond to rescheduling requests');
        }

        return this.orderService.respondToRescheduleRequest(
            requestId,
            req.user?.id?.toString(),
            body,
        );
    }

    @Patch(':id/reschedule/resolve')
    @UseGuards(JwtAuthGuard)
    async resolvePartialReschedule(@Request() req: any, @Param('id') orderId: string, @Body() body: ResolveRescheduleRequestDto) {
        const role = req.user?.role?.toString().trim().toLowerCase();
        if (role !== 'client' && role !== 'organizer') throw new ForbiddenException('Only the booking client can resolve rescheduling');
        if (!['KEEP_ORIGINAL', 'CONTINUE_WITH_NEW_DATE'].includes(body?.action)) throw new BadRequestException('Unsupported rescheduling resolution');
        return this.orderService.resolvePartialReschedule(orderId, req.user?.id?.toString(), body.action);
    }

    @Post('reschedule/expire-stale')
    async expireRescheduleRequests() {
        return this.orderService.expireRescheduleRequests();
    }

    // Delete an order
    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteOrder(@Param('id') orderId: string, @Request() req: any) {
        return this.orderService.deleteOrder(orderId, this.requireOrderAccount(req, undefined, 'Organizer'));
    }
}