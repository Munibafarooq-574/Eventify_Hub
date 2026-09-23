// fyp-backend/src/admin/admin-dispute.controller.ts

import {
  Body,
  BadRequestException,
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
  IsArray,
  IsUrl,
  IsInt,
  Min,
  Max,
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
  @IsArray()
  @IsUrl({}, { each: true })
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

  private validateObjectId(id: string): void {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException('Invalid MongoDB ID');
    }
  }

  @Post('vendor-order/:id')
  raise(
    @Param('id')
    vendorOrderId: string,

    @Body()
    dto: RaiseDisputeDto,
  ) {
    this.validateObjectId(vendorOrderId);

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
    this.validateObjectId(disputeId);

    return this.service.addCounterStatement(
      disputeId,
      dto.from,
      dto.statement,
    );
  }

    @Get()
  list(
    @Query('status') status?: string,
    @Query('limit') limit = '20',
    @Query('skip') skip = '0',
  ) {
    const allowedStatuses = [
      'OPEN',
      'UNDER_REVIEW',
      'RESOLVED_ORGANIZER',
      'RESOLVED_VENDOR',
      'RESOLVED_PARTIAL',
    ];

    if (status && !allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid dispute status');
    }

    const parsedLimit = Number(limit);
    const parsedSkip = Number(skip);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100 ||
      !Number.isInteger(parsedSkip) ||
      parsedSkip < 0
    ) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.service.getDisputes(
      status,
      parsedLimit,
      parsedSkip,
    );
  }

  @Get(':id')
  detail(
    @Param('id')
    disputeId: string,
   ) {
    this.validateObjectId(disputeId);

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
    this.validateObjectId(disputeId);

    return this.service.resolveDispute(
      disputeId,
      dto.resolution,
      dto.notes,
      dto.partialRefundAmount,
    );
  }
}