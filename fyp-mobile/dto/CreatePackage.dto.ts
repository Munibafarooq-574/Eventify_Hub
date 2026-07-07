export interface PackageDto {
    packageName: string;
    price: number;
    services: string;
}

export interface CreatePackagesDto {
    packages: PackageDto[];
}