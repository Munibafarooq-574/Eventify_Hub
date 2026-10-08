import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { City } from '../schemas/city.schema';

@Injectable()
export class CityService {
  constructor(
    @InjectModel(City.name)
    private readonly cityModel: Model<City>,
  ) {}

 async getActiveCities(
  countryCode?: string,
  stateProvinceCode?: string,
) {
  const filter: Record<string, any> = {
    isActive: true,
  };

  if (countryCode?.trim()) {
    filter.countryCode = countryCode.trim().toUpperCase();
  }

  if (stateProvinceCode?.trim()) {
    filter.stateProvinceCode =
      stateProvinceCode.trim().toUpperCase();
  }

  return this.cityModel
    .find(filter)
    .sort({
      countryName: 1,
      stateProvinceName: 1,
      name: 1,
    })
    .select(
      '_id name countryCode countryName stateProvinceCode stateProvinceName',
    )
    .lean();
}

  async requireCityTimeZone(cityId: string): Promise<string> {
    const city = await this.requireActiveCity(cityId);
    if (!city.timeZone) {
      throw new BadRequestException('Selected city has no configured IANA timezone');
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: city.timeZone });
    } catch {
      throw new BadRequestException('Selected city has an invalid IANA timezone');
    }
    return city.timeZone;
  }

  async requireActiveCity(cityId: string) {
    if (!Types.ObjectId.isValid(cityId)) {
      throw new BadRequestException('Invalid city ID.');
    }

    const city = await this.cityModel
      .findOne({
        _id: new Types.ObjectId(cityId),
        isActive: true,
      })
      .lean();

    if (!city) {
      throw new NotFoundException(
        'Selected city does not exist or is inactive.',
      );
    }

    return city;
  }

    // ============================================================
  // ADMIN CITY MANAGEMENT
  // ============================================================

  async getAdminCities(
    search?: string,
    isActive?: boolean,
  ) {
    const filter: Record<string, any> = {};

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (search?.trim()) {
      const escapedSearch =
        search
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        {
          name: {
            $regex: escapedSearch,
            $options: 'i',
          },
        },
        {
          stateProvinceName: {
            $regex: escapedSearch,
            $options: 'i',
          },
        },
        {
          countryName: {
            $regex: escapedSearch,
            $options: 'i',
          },
        },
      ];
    }

    return this.cityModel
      .find(filter)
      .sort({
        countryName: 1,
        stateProvinceName: 1,
        name: 1,
      })
      .lean();
  }

  async createAdminCity(data: {
    name: string;
    countryCode: string;
    countryName: string;
    stateProvinceCode?: string;
    stateProvinceName?: string;
  }) {
    const name = data.name?.trim();
    const countryCode =
      data.countryCode?.trim().toUpperCase();
    const countryName =
      data.countryName?.trim();

    const stateProvinceCode =
      data.stateProvinceCode
        ?.trim()
        .toUpperCase() || undefined;

    const stateProvinceName =
      data.stateProvinceName
        ?.trim() || undefined;

    if (
      !name ||
      !countryCode ||
      !countryName
    ) {
      throw new BadRequestException(
        'City name, country code and country name are required.',
      );
    }

    const existing =
      await this.cityModel.findOne({
        name: {
          $regex:
            `^${name.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            )}$`,
          $options: 'i',
        },
        countryCode,
        stateProvinceCode:
          stateProvinceCode || null,
      });

    if (existing) {
      throw new BadRequestException(
        'This city already exists.',
      );
    }

    return this.cityModel.create({
      name,
      countryCode,
      countryName,
      stateProvinceCode,
      stateProvinceName,
      isActive: true,
    });
  }

  async updateAdminCity(
    cityId: string,
    data: {
      name?: string;
      countryCode?: string;
      countryName?: string;
      stateProvinceCode?: string;
      stateProvinceName?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(cityId)) {
      throw new BadRequestException(
        'Invalid city ID.',
      );
    }

    const city =
      await this.cityModel.findById(cityId);

    if (!city) {
      throw new NotFoundException(
        'City not found.',
      );
    }

    if (data.name !== undefined) {
      const value = data.name.trim();

      if (!value) {
        throw new BadRequestException(
          'City name cannot be empty.',
        );
      }

      city.name = value;
    }

    if (data.countryCode !== undefined) {
      const value =
        data.countryCode
          .trim()
          .toUpperCase();

      if (!value) {
        throw new BadRequestException(
          'Country code cannot be empty.',
        );
      }

      city.countryCode = value;
    }

    if (data.countryName !== undefined) {
      const value =
        data.countryName.trim();

      if (!value) {
        throw new BadRequestException(
          'Country name cannot be empty.',
        );
      }

      city.countryName = value;
    }

    if (
      data.stateProvinceCode !==
      undefined
    ) {
      city.stateProvinceCode =
        data.stateProvinceCode
          .trim()
          .toUpperCase();
    }

    if (
      data.stateProvinceName !==
      undefined
    ) {
      city.stateProvinceName =
        data.stateProvinceName.trim();
    }

    const duplicate =
      await this.cityModel.findOne({
        _id: {
          $ne: city._id,
        },
        name: {
          $regex:
            `^${city.name.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            )}$`,
          $options: 'i',
        },
        countryCode:
          city.countryCode,
        stateProvinceCode:
          city.stateProvinceCode ||
          null,
      });

    if (duplicate) {
      throw new BadRequestException(
        'This city already exists.',
      );
    }

    return city.save();
  }

  async setAdminCityStatus(
    cityId: string,
    isActive: boolean,
  ) {
    if (!Types.ObjectId.isValid(cityId)) {
      throw new BadRequestException(
        'Invalid city ID.',
      );
    }

    if (typeof isActive !== 'boolean') {
      throw new BadRequestException(
        'isActive must be a boolean.',
      );
    }

    const city =
      await this.cityModel.findByIdAndUpdate(
        cityId,
        {
          $set: {
            isActive,
          },
        },
        {
          new: true,
        },
      );

    if (!city) {
      throw new NotFoundException(
        'City not found.',
      );
    }

    return city;
  }
  
  async requireActiveCities(cityIds: string[]) {
    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      throw new BadRequestException(
        'At least one service location city is required.',
      );
    }

    const uniqueIds = [...new Set(cityIds)];

    if (
      uniqueIds.some(
        (cityId) => !Types.ObjectId.isValid(cityId),
      )
    ) {
      throw new BadRequestException(
        'One or more service location city IDs are invalid.',
      );
    }

    const cities = await this.cityModel
      .find({
        _id: {
          $in: uniqueIds.map(
            (cityId) => new Types.ObjectId(cityId),
          ),
        },
        isActive: true,
      })
      .select('_id')
      .lean();

    if (cities.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more service location cities do not exist or are inactive.',
      );
    }

    return cities;
  }
}