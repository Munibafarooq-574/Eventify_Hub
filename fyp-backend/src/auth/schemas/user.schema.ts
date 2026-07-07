import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ContactDetails, ContactDetailsSchema } from './contact-details.schema';
import { Category } from './category.schema';

@Schema({ discriminatorKey: 'type' }) // Add discriminator key to the base schema
export class BusinessDetails extends Document {
}

export const BusinessDetailsSchema = SchemaFactory.createForClass(BusinessDetails);

@Schema()
export class PhotographerBusinessDetails extends BusinessDetails {
  @Prop({ required: true })
  cityCovered: string;

  @Prop({ type: String, enum: ['MALE', 'FEMALE', 'TRANSGENDER'] })
  staff: string;

  @Prop()
  minimumPrice: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  additionalInfo?: string;

  @Prop({ enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' })
  downPaymentType: string;

  @Prop({ required: true })
  downPayment: number;

  @Prop({ enum: ['YES', 'NO'], required: true })
  covidCompliant: string;

  @Prop({
    enum: ['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'],
    required: true,
  })
  covidRefundPolicy: string;
}

export const PhotographerBusinessDetailsSchema = SchemaFactory.createForClass(
  PhotographerBusinessDetails,
);

@Schema()
export class SalonBusinessDetails extends BusinessDetails {
  @Prop({ type: String, enum: ['SOLO', 'SALON', 'HOME-BASED SALON'], required: true })
  staffType: string;

  @Prop({ required: true })
  expertise: string;

  @Prop({ type: Boolean, required: true })
  travelsToClientHome: boolean;

  @Prop({ required: true })
  cityCovered: string;

  @Prop({ type: String, enum: ['MALE', 'FEMALE', 'TRANSGENDER'] })
  staffGender: string;

  @Prop()
  minimumPrice: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  additionalInfo?: string;

  @Prop({ enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' })
  downPaymentType: string;

  @Prop({ required: true })
  downPayment: number;

  @Prop({ enum: ['YES', 'NO'], required: true })
  covidCompliant: string;

  @Prop({
    enum: ['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'],
    required: true,
  })
  cancellationPolicy: string;
}

export const SalonBusinessDetailsSchema = SchemaFactory.createForClass(
  SalonBusinessDetails,
);

@Schema()
export class CateringBusinessDetails extends BusinessDetails {
  @Prop({ required: true })
  expertise: string;

  @Prop({ type: Boolean, required: true })
  travelsToClientHome: boolean;

  @Prop({ required: true })
  cityCovered: string;

  @Prop({ type: String, enum: ['MALE', 'FEMALE', 'TRANSGENDER'] })
  staff: string;

  @Prop({ type: Boolean, default: false })
  provideFoodTesting: boolean;

  @Prop({ type: Boolean, default: false })
  provideDecoration: boolean;

  @Prop({ type: Boolean, default: false })
  provideSoundSystem: boolean;

  @Prop({ type: Boolean, default: false })
  provideSeatingArrangement: boolean;

  @Prop({ type: Boolean, default: false })
  provideWaiters: boolean;

  @Prop({ type: Boolean, default: false })
  provideCutleryAndPlates: boolean;

  @Prop()
  minimumPrice: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  additionalInfo?: string;

  @Prop({ enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' })
  downPaymentType: string;

  @Prop({ required: true })
  downPayment: number;

  @Prop({
    enum: ['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'],
    required: true,
  })
  cancellationPolicy: string;

  @Prop({ enum: ['YES', 'NO'], required: true })
  covidCompliant: string;
}

// Repeat similarly for CateringBusinessDetails and VenueBusinessDetails
export const CateringBusinessDetailsSchema = SchemaFactory.createForClass(
  CateringBusinessDetails,
);

@Schema()
export class VenueBusinessDetails extends BusinessDetails {
  @Prop({
    type: String,
    enum: ['HALL', 'OUTDOOR', 'MARQUEE/BANQUET'],
    required: true,
  })
  typeOfVenue: string;

  @Prop({ required: true })
  expertise: string;

  @Prop({ required: true })
  amenities: string;

  @Prop()
  maximumPeopleCapacity: number;

  @Prop({
    type: String,
    enum: ['INTERNAL', 'EXTERNAL'],
  })
  catering: string;

  @Prop({ type: Boolean, required: true })
  parking: boolean;

  @Prop({
    type: String,
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
  })
  staff: string;

  @Prop()
  minimumPrice: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  additionalInfo?: string;

  @Prop({ enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' })
  downPaymentType: string;

  @Prop({ required: true })
  downPayment: number;

  @Prop({
    enum: ['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'],
    required: true,
  })
  cancellationPolicy: string;

  @Prop({ enum: ['YES', 'NO'], required: true })
  covidCompliant: string;
}

export const VenueBusinessDetailsSchema = SchemaFactory.createForClass(
  VenueBusinessDetails,
);

@Schema()
export class Package {
  @Prop({ required: true })
  packageName: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  services: string;
}

export const PackageSchema = SchemaFactory.createForClass(Package);

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  user_id: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  password?: string;

  @Prop()
  name: string;

  @Prop()
  phone_number: string;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  role: string;

  @Prop()
  created_at: Date;

  @Prop()
  provider?: string;

  @Prop()
  providerId?: string;

  @Prop()
  pushToken?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  buisnessCategory?: any;

  @Prop({ type: ContactDetailsSchema })
  contactDetails?: ContactDetails;

  @Prop({ type: SalonBusinessDetailsSchema })
  salonBusinessDetails?: SalonBusinessDetails;

  @Prop({ type: VenueBusinessDetailsSchema })
  venueBusinessDetails?: VenueBusinessDetails;

  @Prop({ type: CateringBusinessDetailsSchema })
  cateringBusinessDetails?: CateringBusinessDetails;

  @Prop({ type: PhotographerBusinessDetailsSchema })
  photographerBusinessDetails?: PhotographerBusinessDetails;

  @Prop({ type: [PackageSchema], default: [] })
  packages: Package[];

  @Prop({ type: [], default: [] })
  images: string[];

  @Prop()
  coverImage: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Define Discriminators on the BusinessDetails Schema
export const PhotographerDiscriminator = BusinessDetailsSchema.discriminator(
  'Photographer',
  PhotographerBusinessDetailsSchema,
);

export const SalonDiscriminator = BusinessDetailsSchema.discriminator(
  'Salon',
  SalonBusinessDetailsSchema,
);

export const CateringDiscriminator = BusinessDetailsSchema.discriminator(
  'Catering',
  CateringBusinessDetailsSchema,
);

export const VenueDiscriminator = BusinessDetailsSchema.discriminator(
  'Venue',
  VenueBusinessDetailsSchema,
);
