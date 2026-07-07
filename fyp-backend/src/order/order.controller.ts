import { Controller, Post, Body, Patch, Param, Get, Delete, Query } from "@nestjs/common";
import { OrderService } from "./order.service";
import { UpdateOrderStatusDto } from "./dto/update-order-status-dto";

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @Post()
    async placeOrder(@Body() body: {
        organizerId: string;
        eventDate: string;
        eventTime: string;
        eventName: string;
        guests: number;
        services: {
            vendorId: string;
            serviceName: string;
            price: number;
        }[];
    }) {
        try {
            console.log(body.eventName, body.services)
            // Call the service to create the order
            const order = await this.orderService.createOrder(
                body.organizerId,
                new Date(body.eventDate),
                body.eventTime,
                body.services,
                body.eventName,
                body.guests,
            );
            return order;
        } catch (error) {
            console.error('Error placing order:', error);
            throw new Error('Failed to place order');
        }
    }

    @Patch('vendor-response/:id')
    async respondToOrder(
        @Param('id') vendorOrderId: string,
        @Body() body: { status: 'accepted' | 'rejected'; message?: string },
    ) {
        return this.orderService.updateVendorResponse(vendorOrderId, body.status, body.message);
    }

    @Patch('complete-vendor/:id')
    async completeVendor(@Param('id') vendorOrderId: string) {
        return this.orderService.completeVendorOrder(vendorOrderId);
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
