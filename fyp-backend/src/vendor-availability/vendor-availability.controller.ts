//fyp-backend/src/vendor-availability/vendor-availability.controller.ts 
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { VendorAvailabilityService } from './vendor-availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CityService } from '../city/city.service';
import { eventLocalToUtc } from '../common/utils/event-timezone';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vendor-availability')
export class VendorAvailabilityController {
  constructor(private readonly service: VendorAvailabilityService, private readonly cityService: CityService) {}

  @Get(':vendorId')
  getAvailability(@Param('vendorId') vendorId: string) {
    return this.service.getAvailability(vendorId);
  }

  @Patch(':vendorId')
@UseGuards(JwtAuthGuard)
setAvailability(
  @Param('vendorId') vendorId: string,
  @Body() dto: SetAvailabilityDto,
  @Req() req: any,
) {
  if (
    req.user?.role?.toLowerCase() !== 'vendor' ||
    String(req.user?.id) !== String(vendorId)
  ) {
    throw new ForbiddenException(
      'You can only edit your own availability.',
    );
  }

  return this.service.setAvailability(vendorId, dto);
}

    @Post('check')
  async check(@Body() dto: CheckAvailabilityDto) {
    const timeZone = await this.cityService.requireCityTimeZone(dto.eventCityId);
    const start = eventLocalToUtc(dto.eventDate, dto.startTime, timeZone);
    const end = new Date(start.getTime() + dto.durationMinutes * 60000);

    return this.service.checkMany(
      dto.vendorIds,
      start,
      end,
      dto.packageId,
    );
  }

  @Get(':vendorId/slots')
  getSlots(@Param('vendorId') vendorId: string, @Query('date') date: string) {
    return this.service.getDaySlots(vendorId, date);
  }
}