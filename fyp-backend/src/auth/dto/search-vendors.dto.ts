export class SearchVendorsDto {
    name?: string;
    categoryId?: string;
    city?: string;
    minRating?: number;
    staff?: 'MALE' | 'FEMALE' | 'TRANSGENDER';
    cancellationPolicy?: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
}