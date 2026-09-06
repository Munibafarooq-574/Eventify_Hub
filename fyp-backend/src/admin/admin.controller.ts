// fyp-backend/src/admin/admin.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('dashboard')
    getDashboard() {
        return this.adminService.getDashboardStats();
    }

    @Get('bookings')
    getBookings(
        @Query('filter') filter?: string,
        @Query('limit') limit = 20,
        @Query('skip') skip = 0,
    ) {
        return this.adminService.getBookings(filter, limit, skip);
    }

    @Get('bookings/:id')
    getBookingDetail(@Param('id') vendorOrderId: string) {
        return this.adminService.getBookingDetail(vendorOrderId);
    }
}