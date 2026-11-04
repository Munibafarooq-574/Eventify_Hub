import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../schemas/user.schema';
import { CityService } from './city.service';

export type MarketplaceScope = {
  countryCode: string;
  cityId: string;
  businessCityIds: Types.ObjectId[];
};

export function isClientRole(role: string | undefined) {
  return ['client', 'organizer'].includes(role?.trim().toLowerCase() ?? '');
}

@Injectable()
export class MarketplaceGuard implements CanActivate {
  constructor(private readonly cities: CityService, @InjectModel(User.name) private readonly users: Model<User>) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role?.trim().toLowerCase();
    if (['vendor', 'admin', 'superadmin', 'super admin', 'super_admin'].includes(role)) return true;
    if (!isClientRole(role)) throw new ForbiddenException('A marketplace account is required.');

    const scope = await this.cities.getMarketplaceScope(request.user);
    if (!scope) throw new ForbiddenException('Choose your marketplace country and city first.');
    request.marketplace = scope;

    const eventCityId = request.body?.eventCityId ?? request.query?.eventCityId;
    if (eventCityId) {
      const eventCity = await this.cities.requireActiveCity(eventCityId);
      if (eventCity.countryCode !== scope.countryCode) {
        throw new ForbiddenException('Choose an event city in your marketplace country.');
      }
    }

    const services: { vendorId?: unknown }[] | undefined = Array.isArray(request.body?.services)
      ? request.body.services : undefined;
    const vendorId = request.query?.marketplaceVendorId;
    const ids = [...new Set(services?.map(service => String(service?.vendorId ?? '')) ?? (vendorId ? [String(vendorId)] : []))];
    if (ids.length) {
      if (ids.some(id => !Types.ObjectId.isValid(id)) || await this.users.countDocuments({
        _id: { $in: ids },
        role: 'Vendor',
        businessCityId: { $in: scope.businessCityIds },
        ...(eventCityId && services && { serviceLocationCityIds: eventCityId }),
      }) !== ids.length) {
        throw new ForbiddenException('Choose vendors in your marketplace country.');
      }
    }

    return true;
  }
}
