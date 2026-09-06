// constants/AdminColors.ts
//
// Admin panel reuses your existing app theme (constants/Colors.ts).
// This file only adds the few admin-specific status/accent tokens that
// aren't already part of your base theme, so the panel stays visually
// consistent with the rest of Eventify Hub.
//
// IMPORTANT: Replace the fallback hexes below with references to your
// real Colors.ts tokens wherever they already exist (primary, background,
// card, text, border, etc). Search your project for "Colors.ts" and
// import it here instead of hardcoding.

// Example of how this should look once wired to your real theme:
// import Colors from "./Colors";
// export const AdminColors = {
//   ...Colors.light,
//   pending: "#F5A623",
//   processing: "#3B82F6",
//   success: "#22C55E",
//   danger: "#EF4444",
//   dispute: "#A855F7",
// };

export const AdminColors = {
  background: "#F7F8FA",
  card: "#FFFFFF",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  primary: "#5B4EE5", // swap for your existing brand primary
  primaryMuted: "#EDEBFC",

  // status colors — keep in sync with backend enums
  pending: "#F5A623",
  processing: "#3B82F6",
  success: "#22C55E",
  danger: "#EF4444",
  dispute: "#A855F7",

  shadow: "rgba(17, 24, 39, 0.06)",
};

export const statusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return AdminColors.pending;
    case "PROCESSING":
    case "ACCEPTED":
      return AdminColors.processing;
    case "PAID":
    case "CONFIRMED":
    case "COMPLETED":
      return AdminColors.success;
    case "CANCELLED":
    case "FAILED":
    case "REJECTED":
      return AdminColors.danger;
    case "DISPUTE":
    case "OPEN":
    case "REVIEWING":
      return AdminColors.dispute;
    default:
      return AdminColors.textMuted;
  }
};