import { Controller, Get, Query } from '@nestjs/common';
import { CityService } from './city.service';

@Controller('cities')
export class CityController {
  constructor(
    private readonly cityService: CityService,
  ) {}

  @Get()
  getActiveCities(
    @Query('countryCode') countryCode?: string,
    @Query('stateProvinceCode') stateProvinceCode?: string,
  ) {
    return this.cityService.getActiveCities(
      countryCode,
      stateProvinceCode,
    );
  }
}