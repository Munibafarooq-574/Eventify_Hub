import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CityService } from '../city/city.service';

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  AdminRoleGuard,
} from '../auth/admin-role.guard';

@Controller('admin/cities')
@UseGuards(
  JwtAuthGuard,
  AdminRoleGuard,
)
export class AdminCityController {
  constructor(
    private readonly cityService:
      CityService,
  ) {}

  @Get()
  getCities(
    @Query('search')
    search?: string,

    @Query('isActive')
    isActive?: string,
  ) {
    let parsedStatus:
      boolean | undefined;

    if (isActive !== undefined) {
      if (
        isActive !== 'true' &&
        isActive !== 'false'
      ) {
        throw new BadRequestException(
          'isActive must be true or false.',
        );
      }

      parsedStatus =
        isActive === 'true';
    }

    return this.cityService
      .getAdminCities(
        search,
        parsedStatus,
      );
  }

  @Post()
  createCity(
    @Body()
    body: {
      name: string;
      countryCode: string;
      countryName: string;
      stateProvinceCode?: string;
      stateProvinceName?: string;
      timeZone?: string;
    },
  ) {
    return this.cityService
      .createAdminCity(body);
  }

  @Patch(':id')
  updateCity(
    @Param('id')
    cityId: string,

    @Body()
    body: {
      name?: string;
      countryCode?: string;
      countryName?: string;
      stateProvinceCode?: string;
      stateProvinceName?: string;
      timeZone?: string;
    },
  ) {
    return this.cityService
      .updateAdminCity(
        cityId,
        body,
      );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id')
    cityId: string,

    @Body()
    body: {
      isActive: boolean;
    },
  ) {
    return this.cityService
      .setAdminCityStatus(
        cityId,
        body.isActive,
      );
  }
}