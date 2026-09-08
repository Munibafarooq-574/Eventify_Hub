//fyp-mobile/dto/CreatePackage.dto.ts
export interface PackageDurationOptionDto {
  value: number;
  unit: "HOURS" | "DAYS";
  price: number;
}

export interface PackageDto {
  packageName: string;

  // Backward compatibility for old packages
  price?: number;

  description?: string;

  services: string;

  // Fixed duration options
  durations?: PackageDurationOptionDto[];

  // Custom duration
  allowCustomDuration?: boolean;
  customDurationUnit?: "HOURS" | "DAYS";
  customDurationRate?: number;

  // Package-specific images
  images?: string[];
}

export interface CreatePackagesDto {
  packages: PackageDto[];
}
