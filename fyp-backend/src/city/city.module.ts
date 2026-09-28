import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  City,
  CitySchema,
} from '../schemas/city.schema';

import { CityController } from './city.controller';
import { AdminCityController } from '../admin/admin-city.controller';
import { CityService } from './city.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: City.name,
        schema: CitySchema,
      },
    ]),
  ],

  controllers: [
  CityController,
  AdminCityController,
],

  providers: [CityService],

  exports: [
    CityService,
    MongooseModule,
  ],
})
export class CityModule {}