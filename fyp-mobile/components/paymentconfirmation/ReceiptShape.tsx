import React, { createContext, useCallback, useContext, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const PLUM = '#6B1E4F';
const CORNER = 22;
const NOTCH_R = 14;
const SCALLOP_W = 26;
const SCALLOP_H = SCALLOP_W / 2;

const Ctx = createContext<(id: string, y: number) => void>(() => {});

/* Dashed divider: iske dono sides pe notch khud ban jata hai */
export const ReceiptDivider: React.FC<{ id: string; style?: ViewStyle }> = ({
  id,
  style,
}) => {
  const register = useContext(Ctx);
  return (
    <View
      style={[{ marginHorizontal: NOTCH_R + 6, height: 2 }, style]}
      onLayout={(e: LayoutChangeEvent) =>
        register(id, e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)
      }
    >
      <Svg height={2} width="100%">
        <Line
          x1="0" y1="1" x2="100%" y2="1"
          stroke={PLUM} strokeOpacity={0.55} strokeWidth={1.5}
          strokeDasharray="6 5"
        />
      </Svg>
    </View>
  );
};

const buildPath = (w: number, h: number, notchYs: number[]) => {
  const r = CORNER;
  const n = Math.max(1, Math.round((w - 2 * r) / SCALLOP_W));
  const sw = (w - 2 * r) / n;
  const sr = sw / 2;
  const ys = [...notchYs].sort((a, b) => a - b);

  let d = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r}`;

  // right edge (top -> bottom), notches andar ki taraf
  ys.forEach((y) => {
    d += ` V ${y - NOTCH_R} A ${NOTCH_R} ${NOTCH_R} 0 0 0 ${w} ${y + NOTCH_R}`;
  });
  d += ` V ${h - SCALLOP_H - r} Q ${w} ${h - SCALLOP_H} ${w - r} ${h - SCALLOP_H}`;

  // bottom scalloped edge (right -> left)
  for (let i = 0; i < n; i++) {
    const x = w - r - i * sw;
    d += ` L ${x} ${h - SCALLOP_H} A ${sr} ${sr} 0 0 0 ${x - sw} ${h - SCALLOP_H}`;
  }
  d += ` Q 0 ${h - SCALLOP_H} 0 ${h - SCALLOP_H - r}`;

  // left edge (bottom -> top)
  [...ys].reverse().forEach((y) => {
    d += ` V ${y + NOTCH_R} A ${NOTCH_R} ${NOTCH_R} 0 0 0 0 ${y - NOTCH_R}`;
  });
  d += ` V ${r} Q 0 0 ${r} 0 Z`;
  return d;
};

type Props = { children: React.ReactNode; style?: ViewStyle };

const ReceiptShape: React.FC<Props> = ({ children, style }) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [notches, setNotches] = useState<Record<string, number>>({});

  const register = useCallback((id: string, y: number) => {
    setNotches((p) => (Math.abs((p[id] ?? -1) - y) < 0.5 ? p : { ...p, [id]: y }));
  }, []);

  return (
    <Ctx.Provider value={register}>
      <View
        style={[{ alignSelf: 'stretch' }, style]}
        onLayout={(e) =>
          setSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        {size.w > 0 && (
          <Svg
            width={size.w}
            height={size.h}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id="tint" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={PLUM} stopOpacity="0.14" />
                <Stop offset="0.35" stopColor={PLUM} stopOpacity="0.04" />
                <Stop offset="0.6" stopColor={PLUM} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d={buildPath(size.w, size.h, Object.values(notches))} fill="#FFFFFF" />
            <Path d={buildPath(size.w, size.h, Object.values(notches))} fill="url(#tint)" />
          </Svg>
        )}
        {/* content, bottom scallop ke liye jagah */}
        <View style={{ paddingBottom: SCALLOP_H + 14 }}>{children}</View>
      </View>
    </Ctx.Provider>
  );
};

export default ReceiptShape;