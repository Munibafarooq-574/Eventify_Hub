import { User, UserSchema } from '../schemas/user.schema';
import { MarketplaceGuard } from './marketplace.guard';
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
      { name: User.name, schema: UserSchema },
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

  providers: [CityService, MarketplaceGuard],

  exports: [
    CityService,
    MarketplaceGuard,
    MongooseModule,
  ],
})
export class CityModule {}