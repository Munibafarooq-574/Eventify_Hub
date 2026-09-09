// fyp-backend/src/admin/admin-dispute.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { AdminDisputeService } from './admin-dispute.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

class RaiseDisputeDto {
  @IsIn([
    'organizer',
    'vendor',
  ])
  raisedBy!:
    | 'organizer'
    | 'vendor';

  @IsString()
  @IsNotEmpty()
  statement!: string;

  @IsOptional()
  evidenceUrls?: string[];
}

class CounterStatementDto {
  @IsIn([
    'organizer',
    'vendor',
  ])
  from!:
    | 'organizer'
    | 'vendor';

  @IsString()
  @IsNotEmpty()
  statement!: string;
}

class ResolveDisputeDto {
  @IsIn([
    'RESOLVED_ORGANIZER',
    'RESOLVED_VENDOR',
    'RESOLVED_PARTIAL',
  ])
  resolution!:
    | 'RESOLVED_ORGANIZER'
    | 'RESOLVED_VENDOR'
    | 'RESOLVED_PARTIAL';

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  partialRefundAmount?: number;
}

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminDisputeController {
  constructor(
    private readonly service: AdminDisputeService,
  ) {}

  @Post('vendor-order/:id')
  raise(
    @Param('id')
    vendorOrderId: string,

    @Body()
    dto: RaiseDisputeDto,
  ) {
    return this.service.raiseDispute(
      vendorOrderId,
      dto.raisedBy,
      dto.statement,
      dto.evidenceUrls,
    );
  }

  @Patch(':id/counter-statement')
  counter(
    @Param('id')
    disputeId: string,

    @Body()
    dto: CounterStatementDto,
  ) {
    return this.service.addCounterStatement(
      disputeId,
      dto.from,
      dto.statement,
    );
  }

  @Get()
  list(
    @Query('status')
    status?: string,

    @Query('limit')
    limit = 20,

    @Query('skip')
    skip = 0,
  ) {
    return this.service.getDisputes(
      status,
      limit,
      skip,
    );
  }

  @Get(':id')
  detail(
    @Param('id')
    disputeId: string,
  ) {
    return this.service.getDisputeDetail(
      disputeId,
    );
  }

  @Patch(':id/resolve')
  resolve(
    @Param('id')
    disputeId: string,

    @Body()
    dto: ResolveDisputeDto,
  ) {
    return this.service.resolveDispute(
      disputeId,
      dto.resolution,
      dto.notes,
      dto.partialRefundAmount,
    );
  }
}