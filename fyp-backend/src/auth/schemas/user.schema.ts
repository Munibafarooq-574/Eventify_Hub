//fyp-backend/src/auth/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ContactDetails, ContactDetailsSchema } from './contact-details.schema';
import { Category } from './category.schema';

@Schema({ discriminatorKey: 'type' }) // Add discriminator key to the base schema
export class BusinessDetails extends Document {
}

export const BusinessDetailsSchema = SchemaFactory.createForClass(BusinessDetails);

// ==========================================
// Photographer Business Details Schema
// ==========================================

@Schema()
export class PhotographerBusinessDetails extends BusinessDetails {

  // ===============================
  // Photography Services
  // ===============================

  @Prop({
    type: [String],
    enum: [
      'WEDDING',
      'PRE-WEDDING',
      'ENGAGEMENT',
      'BIRTHDAY',
      'CORPORATE',
      'CINEMATIC',
    ],
    default: [],
  })
  photographyTypes: string[];

  // ===============================
  // Equipment
  // ===============================

  @Prop({
    type: [String],
    enum: [
      'DSLR',
      'DRONE',
      '4K VIDEO',
      'LIGHTING',
      'GIMBAL',
    ],
    default: [],
  })
  equipment: string[];

  // ===============================
  // Editing Services
  // ===============================

  @Prop({
    type: [String],
    enum: [
      'PHOTO EDITING',
      'VIDEO EDITING',
      'ALBUM DESIGN',
      'REELS',
    ],
    default: [],
  })
  editingServices: string[];

  // ===============================
  // Photography Team
  // ===============================

  @Prop({
    type: [String],
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
    default: [],
  })
  staffGender: string[];

  // ===============================
  // Photography Style
  // ===============================

  @Prop({
    type: [String],
    enum: [
      'TRADITIONAL',
      'CANDID',
      'CINEMATIC',
      'DOCUMENTARY',
    ],
    default: [],
  })
  photoStyle: string[];

  // ===============================
  // Travels To Client
  // ===============================

  @Prop({
    type: Boolean,
    required: true,
  })
  travelsToClientHome: boolean;

  // ===============================
  // Delivery Time
  // ===============================

  @Prop({
    enum: [
      '2 DAYS',
      '5 DAYS',
      '1 WEEK',
      '2 WEEKS',
    ],
    required: true,
  })
  deliveryTime: string;

  // ===============================
  // City Covered
  // ===============================

  @Prop({
    required: true,
  })
  cityCovered: string;

  // ===============================
  // Starting Price
  // ===============================

  @Prop({
    required: true,
  })
  minimumPrice: number;

  // ===============================
  // Description
  // ===============================

  @Prop({
    required: true,
  })
  description: string;

  // ===============================
  // Additional Information
  // ===============================

  @Prop()
  additionalInfo?: string;

  // ===============================
  // Down Payment Type
  // ===============================

  @Prop({
    enum: ['PERCENTAGE', 'FIXED'],
    default: 'PERCENTAGE',
  })
  downPaymentType: string;

  // ===============================
  // Down Payment
  // ===============================

  @Prop({
    required: true,
  })
  downPayment: number;

  // ===============================
  // Covid Safety
  // ===============================

  @Prop({
    enum: ['YES', 'NO'],
    required: true,
  })
  covidCompliant: string;

  // ===============================
  // Refund Policy
  // ===============================

  @Prop({
    enum: [
      'REFUNDABLE',
      'NON-REFUNDABLE',
      'PARTIALLY REFUNDABLE',
    ],
    required: true,
  })
  covidRefundPolicy: string;
}

export const PhotographerBusinessDetailsSchema =
  SchemaFactory.createForClass(
    PhotographerBusinessDetails,
  );

@Schema()
export class SalonBusinessDetails extends BusinessDetails {
  @Prop({
    type: String,
    enum: ['SOLO', 'SALON', 'HOME-BASED SALON'],
    required: true,
  })
  staffType: string;

  @Prop({ required: true })
  expertise: string;

  @Prop({ type: Boolean, required: true })
  travelsToClientHome: boolean;

  @Prop({ required: true })
  cityCovered: string;

  @Prop({
    type: [String],
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
    default: [],
  })
  staffGender: string[];

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

  @Prop({
    type: [String],
    enum: [
      'WEDDING',
      'ENGAGEMENT',
      'BIRTHDAY',
      'CORPORATE',
      'BBQ',
      'BUFFET',
    ],
    default: [],
  })
  expertise: string[];

  @Prop({ type: Boolean, required: true })
  travelsToClientHome: boolean;

  @Prop({ required: true })
    cityCovered: string;

  @Prop({
    type: [String],
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
    default: [],
  })
  staff: string[];

  @Prop({ default: false })
  provideFoodTesting: boolean;

  @Prop({ default: false })
  provideDecoration: boolean;

  @Prop({ default: false })
  provideSoundSystem: boolean;

  @Prop({ default: false })
  provideSeatingArrangement: boolean;

  @Prop({ default: false })
  provideWaiters: boolean;

  @Prop({ default: false })
  provideCutleryAndPlates: boolean;

  @Prop()
  minimumPrice: number;

  @Prop({ required: true })
  description: string;

  @Prop()
  additionalInfo?: string;

  @Prop({
    enum: ['PERCENTAGE', 'FIXED'],
    default: 'PERCENTAGE',
  })
  downPaymentType: string;

  @Prop({ required: true })
  downPayment: number;

  @Prop({
    enum: [
      'REFUNDABLE',
      'NON-REFUNDABLE',
      'PARTIALLY REFUNDABLE',
    ],
    required: true,
  })
  cancellationPolicy: string;

  @Prop({
    enum: ['YES', 'NO'],
    required: true,
  })
  covidCompliant: string;
}
// Repeat similarly for CateringBusinessDetails and VenueBusinessDetails
export const CateringBusinessDetailsSchema = SchemaFactory.createForClass(
  CateringBusinessDetails,
);

@Schema()
export class VenueBusinessDetails extends BusinessDetails {
  @Prop({
  type: [String],
  enum: ['HALL', 'OUTDOOR', 'MARQUEE/BANQUET'],
  default: [],
})
typeOfVenue: string[];

  @Prop({ required: true })
  expertise: string;

  @Prop({ required: true })
  amenities: string;

  @Prop()
  maximumPeopleCapacity: number;

  @Prop({
    type: [String],
    enum: ['INTERNAL', 'EXTERNAL'],
    default: [],
  })
  catering: string[];               // <-- now multi-select

  @Prop({ type: Boolean, required: true })
  parking: boolean;

  @Prop({
    type: [String],
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
    default: [],
  })
  staff: string[];                  // <-- now multi-select

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
export class CakeBusinessDetails extends BusinessDetails {

  @Prop({
    type: [String],
    default: [],
  })
  cakeTypes: string[];

  @Prop()
  minimumPrice: number;

  @Prop()
  expertise: string;

  @Prop()
  cityCovered: string;

  @Prop({
    type: [String],
    default: [],
  })
  deliveryOptions: string[];

  @Prop()
  deliveryToHome: boolean;

  @Prop()
  description: string;

  @Prop()
  additionalInfo: string;

  @Prop()
  downPaymentType: string;

  @Prop()
  downPayment: number;

  @Prop()
  cancellationPolicy: string;

  @Prop()
  covidCompliant: string;
}

export const CakeBusinessDetailsSchema =
  SchemaFactory.createForClass(CakeBusinessDetails);

@Schema()
export class MehndiBusinessDetails extends BusinessDetails {
  @Prop({
    type: [String],
    enum: ['BRIDAL', 'PARTY', 'ARABIC', 'GLITTER'],
    default: [],
  })
  mehndiType: string[];

  @Prop({ type: Boolean, required: true })
  travelsToClientHome: boolean;

  @Prop({ required: true })
  cityCovered: string;

  @Prop({
    type: [String],
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
    default: [],
  })
  staffGender: string[];

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

export const MehndiBusinessDetailsSchema = SchemaFactory.createForClass(
  MehndiBusinessDetails,
);

@Schema()
export class SoundBusinessDetails extends BusinessDetails {
  @Prop({
    type: [String],
    enum: ['WEDDING DJ', 'PARTY DJ', 'CORPORATE', 'LIVE BAND'],
    default: [],
  })
  soundType: string[];

  @Prop({
    type: [String],
    enum: ['SPEAKERS', 'MICROPHONE', 'LIGHTING', 'DJ CONSOLE', 'PROJECTOR'],
    default: [],
  })
  equipmentProvided: string[];

  @Prop({ type: Boolean, required: true })
  travelsToClientHome: boolean;

  @Prop({ required: true })
  cityCovered: string;

  @Prop({
    type: [String],
    enum: ['MALE', 'FEMALE', 'TRANSGENDER'],
    default: [],
  })
  staffGender: string[];

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

export const SoundBusinessDetailsSchema = SchemaFactory.createForClass(
  SoundBusinessDetails,
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

  @Prop({ type: CakeBusinessDetailsSchema })
cakeBusinessDetails?: CakeBusinessDetails;

  @Prop({ type: MehndiBusinessDetailsSchema })
  mehndiBusinessDetails?: MehndiBusinessDetails;

  @Prop({ type: SoundBusinessDetailsSchema })
  soundBusinessDetails?: SoundBusinessDetails;

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

export const CakeDiscriminator = BusinessDetailsSchema.discriminator(
  'Cake',
  CakeBusinessDetailsSchema,
);

export const MehndiDiscriminator = BusinessDetailsSchema.discriminator(
  'Mehndi',
  MehndiBusinessDetailsSchema,
);

export const SoundDiscriminator = BusinessDetailsSchema.discriminator(
  'Sound',
  SoundBusinessDetailsSchema,
);