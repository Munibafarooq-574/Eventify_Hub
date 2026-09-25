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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function buildRange(eventDate: string, startTime: string, durationMinutes: number) {
  const [h, m] = startTime.split(':').map(Number);
  const start = new Date(eventDate);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return { start, end };
}

@Controller('vendor-availability')
export class VendorAvailabilityController {
  constructor(private readonly service: VendorAvailabilityService) {}

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
    const { start, end } = buildRange(
      dto.eventDate,
      dto.startTime,
      dto.durationMinutes,
    );

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