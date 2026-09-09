// fyp-backend/src/admin/admin-commission.controller.ts

import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';

import {
  IsInt,
  Max,
  Min,
} from 'class-validator';

import { AdminCommissionService } from './admin-commission.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

class UpdateCommissionDto {
  @IsInt()
  @Min(0)
  @Max(100)
  platformCommissionPercentage!: number;
}

@Controller('admin/commission')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminCommissionController {
  constructor(
    private readonly service: AdminCommissionService,
  ) {}

  @Get()
  get() {
    return this.service.getConfig();
  }

  @Patch()
  update(
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.service.updateConfig(
      dto.platformCommissionPercentage,
    );
  }
}