export class PackageDto {
    packageName: string;
    price: number;
    services: string;
}

export class CreatePackagesDto {
    packages: PackageDto[];
}