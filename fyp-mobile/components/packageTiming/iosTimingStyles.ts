import { StyleSheet } from "react-native";

export const compactUnitLabels = {
  MINUTES: "Min",
  HOURS: "Hr",
  DAYS: "Days",
};

export const iosTimingStyles = StyleSheet.create({
  field: {
    backgroundColor: "#FBF6FA",
    borderColor: "#EFE0EB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  amountRow: {
    alignItems: "center",
    gap: 6,
  },
  amount: {
    width: 64,
    height: 44,
    paddingHorizontal: 6,
    paddingVertical: 0,
    marginBottom: 0,
    textAlign: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  segments: {
    flexWrap: "nowrap",
    gap: 0,
    borderRadius: 12,
    backgroundColor: "#F0E5EE",
  },
  segment: {
    minWidth: 0,
    height: "auto",
    minHeight: 44,
    paddingHorizontal: 2,
    paddingVertical: 5,
    borderWidth: 0,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  selectedSegment: {
    backgroundColor: "#7B2869",
  },
});
