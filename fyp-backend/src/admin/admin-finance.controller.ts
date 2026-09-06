// fyp-backend/src/admin/admin-finance.controller.ts
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AdminFinanceService } from './admin-finance.service';

class UpdateRefundStatusDto {
    @IsIn(['PENDING', 'PROCESSING', 'PAID'])
    status!: 'PENDING' | 'PROCESSING' | 'PAID';
}

@Controller('admin/finance')
export class AdminFinanceController {
    constructor(private readonly service: AdminFinanceService) {}

    @Get('payments')
    getPayments(
        @Query('status') status?: string,
        @Query('limit') limit = 20,
        @Query('skip') skip = 0,
    ) {
        return this.service.getPayments(status, limit, skip);
    }

    @Get('refunds')
    getRefunds(
        @Query('status') status?: string,
        @Query('limit') limit = 20,
        @Query('skip') skip = 0,
    ) {
        return this.service.getRefunds(status, limit, skip);
    }

    @Patch('refunds/:id/status')
    updateRefundStatus(@Param('id') id: string, @Body() dto: UpdateRefundStatusDto) {
        return this.service.updateRefundStatus(id, dto.status);
    }

    @Get('payouts')
    getPayouts(
        @Query('status') status?: string,
        @Query('limit') limit = 20,
        @Query('skip') skip = 0,
    ) {
        return this.service.getPayouts(status, limit, skip);
    }
}