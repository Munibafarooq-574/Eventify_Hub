export interface CreateContactDetailsDto {
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
