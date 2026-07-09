import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Circle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';

interface SnowflakeChartProps {
  data: {
    O: number;
    C: number;
    E: number;
    A: number;
    S: number;
    M: number;
  };
  size?: number;
  colors: any;
  lang: 'en' | 'es';
}

export const SnowflakeChart: React.FC<SnowflakeChartProps> = ({ data, size = 300, colors, lang }) => {
  const C = 150; // Half of 300
  const R = 96;  // 300 * 0.32
  
  // Hardcoded angles in radians
  const a0 = -1.5707; // -PI/2
  const a1 = -0.5235; // -PI/6
  const a2 = 0.5235;  // PI/6
  const a3 = 1.5707;  // PI/2
  const a4 = 2.6179;  // 5PI/6
  const a5 = 3.6651;  // 7PI/6

  const safeNum = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0.1 : Math.max(num, 0.1);
  };

  const vO = safeNum(data.O);
  const vC = safeNum(data.C);
  const vE = safeNum(data.E);
  const vA = safeNum(data.A);
  const vS = safeNum(data.S);
  const vM = safeNum(data.M);

  const p0 = `${C + R * vO * Math.cos(a0)},${C + R * vO * Math.sin(a0)}`;
  const p1 = `${C + R * vC * Math.cos(a1)},${C + R * vC * Math.sin(a1)}`;
  const p2 = `${C + R * vE * Math.cos(a2)},${C + R * vE * Math.sin(a2)}`;
  const p3 = `${C + R * vA * Math.cos(a3)},${C + R * vA * Math.sin(a3)}`;
  const p4 = `${C + R * vS * Math.cos(a4)},${C + R * vS * Math.sin(a4)}`;
  const p5 = `${C + R * vM * Math.cos(a5)},${C + R * vM * Math.sin(a5)}`;

  const pointsStr = `${p0} ${p1} ${p2} ${p3} ${p4} ${p5}`;

  const labels = lang === 'es'
    ? ['Apertura', 'Orden', 'Energía', 'Empatía', 'Calma', 'Ánimo']
    : ['Openness', 'Order', 'Energy', 'Empathy', 'Calm', 'Mood'];

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 20, marginVertical: 10, padding: 15 }}>
      <Svg width={300} height={300}>
        <Defs>
          <RadialGradient id="innerShadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#F8F8F8" stopOpacity="1" />
            <Stop offset="0.7" stopColor="#F0F0F0" stopOpacity="1" />
            <Stop offset="1" stopColor="#E0E0E0" stopOpacity="0.6" />
          </RadialGradient>
        </Defs>

        <Circle cx={150} cy={150} r={110} fill="url(#innerShadow)" />

        {[1, 0.75, 0.5, 0.25].map((tick) => {
          const tickR = 96 * tick;
          const pts = [
            `150,${150 - tickR}`,
            `${150 + tickR * 0.866},${150 - tickR * 0.5}`,
            `${150 + tickR * 0.866},${150 + tickR * 0.5}`,
            `150,${150 + tickR}`,
            `${150 - tickR * 0.866},${150 + tickR * 0.5}`,
            `${150 - tickR * 0.866},${150 - tickR * 0.5}`
          ].join(' ');
          return (
            <Polygon key={tick} points={pts} fill="none" stroke="#DDD" strokeWidth="1" strokeDasharray="3,3" />
          );
        })}

        <Polygon points={pointsStr} fill="#6366f1" fillOpacity={0.5} stroke="#4f46e5" strokeWidth={2.5} />

        {/* Labels with hardcoded positions for maximum stability */}
        {labels.map((label, i) => {
          const labelR = 135;
          const a = [-1.5707, -0.5235, 0.5235, 1.5707, 2.6179, 3.6651][i];
          const lx = 150 + labelR * Math.cos(a);
          const ly = 150 + labelR * Math.sin(a);
          return (
            <SvgText key={i} x={lx} y={ly} dy="4" fill="#666" fontSize="12" fontWeight="bold" textAnchor="middle">
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

