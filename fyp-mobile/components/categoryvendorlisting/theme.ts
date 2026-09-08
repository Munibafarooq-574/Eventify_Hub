// fyp-mobile/components/categoryvendorlisting/theme.ts
import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_WIDTH = 375;
const MAX_SCALE = 1.25;
const MIN_SCALE = 0.85;

export function scale(size: number) {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const clamped = Math.min(Math.max(ratio, MIN_SCALE), MAX_SCALE);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
}

export const isSmallScreen = SCREEN_WIDTH < 360;

export const COLORS = {
  bg: "#FBF1F5",
  card: "#FFFFFF",
  primary: "#780C60",
  primaryDark: "#5C0A49",
  primarySoft: "#F4E3ED",
  gold: "#E3A008",
  success: "#1E9E5A",
  successSoft: "#E7F7EE",
  ink: "#241723",
  inkMuted: "#8A7A87",
  border: "#F0DDE9",
  placeholder: "#B9A9B4",
};