import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class City extends Document {
  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  name: string;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    minlength: 2,
    maxlength: 2,
    index: true,
  })
  countryCode: string; // US, PK, GB, CA

  @Prop({
    required: true,
    trim: true,
  })
  countryName: string;

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  stateProvinceCode: string; // CA, TX, NY, PB etc.

  @Prop({
    required: true,
    trim: true,
  })
  stateProvinceName: string;

    @Prop({
    type: String,
    trim: true,
    required: false,
  })
  timeZone?: string;
  
  @Prop({
    default: true,
    index: true,
  })
  isActive: boolean;
}

export const CitySchema = SchemaFactory.createForClass(City);

CitySchema.index(
  {
    name: 1,
    stateProvinceCode: 1,
    countryCode: 1,
  },
  {
    unique: true,
  },
);

CitySchema.index({
  countryCode: 1,
  stateProvinceCode: 1,
  isActive: 1,
  name: 1,
});