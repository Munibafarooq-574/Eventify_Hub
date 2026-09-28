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

    // Determines how this package uses vendor availability
  bookingType?:
    | "DURATION_BASED"
    | "TIME_SLOT_BASED"
    | "DELIVERY_BASED"
    | "SETUP_BASED"
    | "CUSTOM";

  // Required vendor service time where applicable
  requiredServiceDurationMinutes?: number;

  // Service window relative to event start
  serviceWindowStartOffsetMinutes?: number;
  serviceWindowEndOffsetMinutes?: number;

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
