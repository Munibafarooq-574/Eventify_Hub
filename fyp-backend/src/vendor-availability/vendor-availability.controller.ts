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
  BadRequestException,
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
      dto.packageId, dto.replacementMode === true, timeZone,
    );
  }

  @Post('appointment-candidates')
  async appointmentCandidates(
    @Body() dto: {
      vendorId: string;
      packageId: string;
      eventCityId: string;
      eventDate: string;
      eventStartTime: string;
      eventDurationMinutes: number;
    },
  ) {
    if (
      !dto || !dto.vendorId || !dto.packageId || !dto.eventCityId ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dto.eventDate ?? '') ||
      !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(dto.eventStartTime ?? '') ||
      !Number.isSafeInteger(dto.eventDurationMinutes) ||
      dto.eventDurationMinutes < 1 || dto.eventDurationMinutes > 1440
    ) {
      throw new BadRequestException('Invalid appointment search request');
    }
    const timeZone = await this.cityService.requireCityTimeZone(dto.eventCityId);
    const start = eventLocalToUtc(dto.eventDate, dto.eventStartTime, timeZone);
    const end = new Date(start.getTime() + dto.eventDurationMinutes * 60000);
    return this.service.getAppointmentCandidates(
      dto.vendorId, dto.packageId, start, end, timeZone,
    );
  }

  @Get(':vendorId/slots')
  getSlots(@Param('vendorId') vendorId: string, @Query('date') date: string) {
    return this.service.getDaySlots(vendorId, date);
  }
}