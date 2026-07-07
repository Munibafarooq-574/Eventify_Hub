import { Schema, Document } from 'mongoose';

export interface ContactDetails {
    brandName: string;
    brandLogo: string;
    contactNumber: string;
    contactNumberSecondary?: string;
    instagramLink: string;
    facebookLink?: string;
    bookingEmail: string;
    website?: string;
    city: string;
    officialAddress?: string;
    officialGoogleLink?: string;
}

export const ContactDetailsSchema = new Schema<ContactDetails>({
    brandName: { type: String, required: true },
    brandLogo: { type: String, required: true },
    contactNumber: { type: String, required: true },
    contactNumberSecondary: { type: String },
    instagramLink: { type: String, required: true },
    facebookLink: { type: String },
    bookingEmail: { type: String, required: true },
    website: { type: String },
    city: { type: String, required: true },
    officialAddress: { type: String },
    officialGoogleLink: { type: String },
});
