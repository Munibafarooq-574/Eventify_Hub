import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../../auth/admin-role.guard';
import { PlanCatalogService } from './plan-catalog.service';

@Controller('admin/subscription-catalog')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class PlanCatalogController {
  constructor(private readonly catalog: PlanCatalogService) {}

  @Get()
  async getCatalog() {
    const [plans, features] = await Promise.all([this.catalog.list(), this.catalog.getFeatures()]);
    return { plans, features };
  }

  @Post('plans/:key')
  createPlan(@Param('key') key: string, @Body() body: unknown) {
    return this.catalog.savePlan(key, body, true);
  }

  @Put('plans/:key')
  updatePlan(@Param('key') key: string, @Body() body: unknown) {
    return this.catalog.savePlan(key, body, false);
  }

  @Post('features')
  addFeature(@Body('name') name: unknown) {
    return this.catalog.addFeature(name);
  }
}
