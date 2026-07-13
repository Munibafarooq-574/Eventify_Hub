//fyp-mobile/dto/CreatePhotographyBusinessDetails.dto.ts

/*export interface CreatePhotographerBusinessDetailsDto {
    cityCovered: string;
    staff: string;
    minimumPrice: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    covidCompliant: 'YES' | 'NO';
    covidRefundPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
} */

    // ===============================
// FRONTEND DTO
// Used in React Native
// Sent to Backend API
// ===============================

export interface PhotographyBusinessDetailsDto {
  photographyTypes: string[];

  equipment: string[];

  editingServices: string[];

  staffGender: string[];

  photoStyle: string[];

  travelsToClientHome: boolean;

  deliveryTime: string;

  cityCovered: string;

  minimumPrice: number;

  description: string;

  additionalInfo?: string;

  downPaymentType: "PERCENTAGE" | "FIXED";

  downPayment: number;

  covidCompliant: "YES" | "NO";

  covidRefundPolicy:
    | "REFUNDABLE"
    | "NON-REFUNDABLE"
    | "PARTIALLY REFUNDABLE";
}