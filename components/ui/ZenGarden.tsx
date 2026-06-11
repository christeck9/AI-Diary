import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Canvas, Circle, Group, LinearGradient, vec, BlurMask, Path, Paint, Skia, Text, useFont, Line, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming, useFrameCallback, runOnJS } from 'react-native-reanimated';
import { Image } from 'react-native';
import { useCircadianCycle } from '../../hooks/useCircadianCycle';
import { useAppTheme } from '../../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

// Propiedades que recibirá el componente desde la UI principal
export interface ZenGardenProps {
  treeState: { strength: number; equanimity: number; wisdom: number };
  flora: { id: number; type: string; status: string; category?: string; label?: string }[];
  isStreaming: boolean;
}

export const ZenGarden: React.FC<ZenGardenProps> = ({ treeState, flora, isStreaming }) => {
  const { isDayTime } = useCircadianCycle();
  const { activeTheme } = useAppTheme();
  const defaultFont = useFont(null, 10);
  
  // El Modo Zion se activa directamente cuando el usuario tiene seleccionado el tema ZION (matrix)
  const isZionMode = activeTheme === 'matrix';

  // Transición suave entre día, noche y Zion (1.5 segundos de fundido)
  const dayOpacity = useDerivedValue(() => {
    return withTiming(isZionMode ? 0 : (isDayTime ? 1 : 0), { duration: 1500 });
  });
  const nightOpacity = useDerivedValue(() => {
    return withTiming(isZionMode ? 0 : (isDayTime ? 0 : 1), { duration: 1500 });
  });
  // ────────────────────────────────────────────────────────────────────────
  // 1. GESTIÓN DE AUTO-THROTTLING & ESTRÉS (FPS Dinámicos)
  // ────────────────────────────────────────────────────────────────────────
  const fpsTarget = useSharedValue(30);
  const lastFrameTime = useSharedValue(0);
  const time = useSharedValue(0);
  const [currentFPS, setCurrentFPS] = useState(30);

  useEffect(() => {
    if (isStreaming) {
      // MODO SUPERVIVENCIA: Congela o baja drásticamente los FPS cuando el LLM está infiriendo
      fpsTarget.value = 5; 
      setCurrentFPS(5);
    } else {
      fpsTarget.value = 30; // Volver a fluidez normal
      setCurrentFPS(30);
    }
  }, [isStreaming, fpsTarget]);

  const onFpsDowngrade = (newFps: number) => {
    setCurrentFPS(newFps);
  };

  useFrameCallback((frameInfo) => {
    if (!frameInfo.timestamp) return;
    
    // Calcular Delta (tiempo real transcurrido entre frames)
    const delta = frameInfo.timestamp - lastFrameTime.value;
    const target = fpsTarget.value;
    
    // Si la latencia es demasiado alta (> 50ms = < 20 FPS reales) y no estamos en inferencia
    if (delta > 50 && target === 30 && !isStreaming) {
      fpsTarget.value = 15; // Downgrade preventivo
      runOnJS(onFpsDowngrade)(15);
    } else if (delta < 35 && target === 15 && !isStreaming) {
      fpsTarget.value = 30; // Upgrade si la temperatura baja
      runOnJS(onFpsDowngrade)(30);
    }

    const expectedInterval = target === 0 ? Infinity : 1000 / target;

    // Solo actualizar el reloj de Skia si se cumplió el intervalo del FPS
    if (delta >= expectedInterval) {
      time.value += delta;
      lastFrameTime.value = frameInfo.timestamp;
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // 2. CONSTRUCCIÓN DE LA ARQUITECTURA VECTORIAL (Procedural Tree)
  // ────────────────────────────────────────────────────────────────────────
  
  // El crecimiento de las ramas depende de treeState
  const maxGrowth = 1.0; 
  const branchThickness = Math.max(1, (treeState.strength || 0) * 0.1);
  const swayIntensity = Math.max(0.1, 1 - (treeState.equanimity || 0) * 0.05); // Menos equanimidad = más agitación
  const illumination = Math.min(1, (treeState.wisdom || 0) * 0.05); // Brillo general

  // ────────────────────────────────────────────────────────────────────────
  // 3. ESTRUCTURAS ESQUEMÁTICAS MODO ZION (Easter Egg)
  // ────────────────────────────────────────────────────────────────────────
  
  // Cascada de lluvia digital vertical
  const rainOffsetA = useDerivedValue(() => (time.value * 0.12) % (height + 250) - 250);
  const rainOffsetB = useDerivedValue(() => (time.value * 0.08) % (height + 250) - 250);
  const rainOffsetC = useDerivedValue(() => (time.value * 0.16) % (height + 250) - 250);

  // Animaciones de transformación para lluvia digital (definidas a nivel superior para cumplir las Reglas de Hooks)
  const rainTransformA = useDerivedValue(() => [{ translateY: rainOffsetA.value }]);
  const rainTransformB = useDerivedValue(() => [{ translateY: rainOffsetB.value }]);
  const rainTransformC = useDerivedValue(() => [{ translateY: rainOffsetC.value }]);

  // Pulso electromagnético en nodos Sefirot
  const pulseRadius = useDerivedValue(() => 10 + Math.sin(time.value / 250) * 2.5);
  const pulseOpacity = useDerivedValue(() => 0.45 + Math.sin(time.value / 250) * 0.25);

  // Montañas vectoriales (Zion)
  const zionMountains = useMemo(() => {
    const p1 = Skia.Path.Make();
    p1.moveTo(0, height * 0.55);
    p1.lineTo(width * 0.2, height * 0.48);
    p1.lineTo(width * 0.4, height * 0.53);
    p1.lineTo(width * 0.55, height * 0.46);
    p1.lineTo(width * 0.75, height * 0.52);
    p1.lineTo(width * 0.9, height * 0.49);
    p1.lineTo(width, height * 0.54);

    const p2 = Skia.Path.Make();
    p2.moveTo(0, height * 0.60);
    p2.lineTo(width * 0.3, height * 0.53);
    p2.lineTo(width * 0.65, height * 0.57);
    p2.lineTo(width * 0.85, height * 0.51);
    p2.lineTo(width, height * 0.58);

    return { p1, p2 };
  }, []);

  // Líneas de bus de circuito de tronco (Zion)
  const zionTrunkPaths = useMemo(() => {
    const center = Skia.Path.Make();
    center.moveTo(width / 2, height * 0.65);
    center.quadTo(width / 2 + 15, height * 0.58, width / 2, height * 0.48);

    const left = Skia.Path.Make();
    left.moveTo(width / 2 - 6, height * 0.65);
    left.quadTo(width / 2 + 9, height * 0.58, width / 2 - 6, height * 0.48);

    const right = Skia.Path.Make();
    right.moveTo(width / 2 + 6, height * 0.65);
    right.quadTo(width / 2 + 21, height * 0.58, width / 2 + 6, height * 0.48);

    return { center, left, right };
  }, []);

  // Raíces vectoriales de circuito impreso (Zion)
  const zionRoots = useMemo(() => {
    const paths = [];

    // Raíz 1
    const r1 = Skia.Path.Make();
    r1.moveTo(width / 2, height * 0.65);
    r1.lineTo(width / 2 - 50, height * 0.70);
    r1.lineTo(width / 2 - 120, height * 0.70);
    r1.lineTo(width / 2 - 160, height * 0.80);
    paths.push(r1);

    // Raíz 2
    const r2 = Skia.Path.Make();
    r2.moveTo(width / 2, height * 0.65);
    r2.lineTo(width / 2 + 50, height * 0.70);
    r2.lineTo(width / 2 + 120, height * 0.70);
    r2.lineTo(width / 2 + 160, height * 0.80);
    paths.push(r2);

    // Raíz 3
    const r3 = Skia.Path.Make();
    r3.moveTo(width / 2 - 6, height * 0.65);
    r3.lineTo(width / 2 - 30, height * 0.75);
    r3.lineTo(width / 2 - 30, height * 0.85);
    r3.lineTo(width / 2 - 70, height * 0.92);
    paths.push(r3);

    // Raíz 4
    const r4 = Skia.Path.Make();
    r4.moveTo(width / 2 + 6, height * 0.65);
    r4.lineTo(width / 2 + 30, height * 0.75);
    r4.lineTo(width / 2 + 30, height * 0.85);
    r4.lineTo(width / 2 + 70, height * 0.92);
    paths.push(r4);

    // Raíz 5
    const r5 = Skia.Path.Make();
    r5.moveTo(width / 2 - 3, height * 0.65);
    r5.lineTo(width / 2 - 80, height * 0.78);
    r5.lineTo(width / 2 - 130, height * 0.88);
    paths.push(r5);

    // Raíz 6
    const r6 = Skia.Path.Make();
    r6.moveTo(width / 2 + 3, height * 0.65);
    r6.lineTo(width / 2 + 80, height * 0.78);
    r6.lineTo(width / 2 + 130, height * 0.88);
    paths.push(r6);

    return paths;
  }, []);

  // 22 Caminos Sefiróticos tradicionales de interconexión
  const sephirotConnections = useMemo(() => [
    [0, 1], [0, 2], [0, 5], // Kether a Chokmah, Binah, Tiphareth
    [1, 2],                 // Chokmah a Binah
    [1, 3], [1, 4], [1, 5], // Chokmah a Chesed, Geburah, Tiphareth
    [2, 3], [2, 4], [2, 5], // Binah a Chesed, Geburah, Tiphareth
    [3, 4], [3, 5], [3, 6], // Chesed a Geburah, Tiphareth, Netzach
    [4, 5], [4, 7],         // Geburah a Tiphareth, Hod
    [5, 6], [5, 7], [5, 8], // Tiphareth a Netzach, Hod, Yesod
    [6, 7], [6, 8],         // Netzach a Hod, Yesod
    [7, 8],                 // Hod a Yesod
    [8, 9]                  // Yesod a Malkuth
  ], []);

  // Generamos rutas estáticas (por performance, solo el offset animará el sway)
  const treePath = useMemo(() => {
    const p = Skia.Path.Make();
    // Base del tronco (alineada con la base de rocas del árbol de fondo)
    p.moveTo(width / 2, height * 0.65);
    // Tronco principal con curva
    p.quadTo(width / 2 + 15, height * 0.58, width / 2, height * 0.48);
    
    // Rama Izquierda (Fuerza)
    p.quadTo(width / 2 - 30, height * 0.45, width / 2 - 60, height * 0.42);
    
    // Rama Derecha (Sabiduría)
    p.moveTo(width / 2, height * 0.48);
    p.quadTo(width / 2 + 30, height * 0.45, width / 2 + 60, height * 0.42);
    
    // Rama Central (Ecuanimidad)
    p.moveTo(width / 2, height * 0.48);
    p.quadTo(width / 2 - 10, height * 0.43, width / 2, height * 0.38);
    
    return p;
  }, []);

  // Animaciones de balanceo (Sway) derivadas del tiempo estrangulado
  const swayTransform = useDerivedValue(() => {
    const translateX = Math.sin(time.value / 2000) * (10 * swayIntensity);
    return [{ translateX }];
  });
  
  // Posiciones de la flora alrededor de la base de rocas
  const floraPositions = useMemo(() => {
    return flora.map((f, i) => {
      const angle = (i / flora.length) * Math.PI;
      const radius = 30 + Math.random() * 45;
      return {
        ...f,
        x: width / 2 + Math.cos(angle) * radius * (i % 2 === 0 ? 1 : -1),
        y: height * 0.65 + Math.sin(angle) * 15,
        delay: Math.random() * 1000
      };
    });
  }, [flora]);

  // Posiciones Kabbalísticas (Sephirot) superpuestas al Árbol
  const sephirotNodes = useMemo(() => {
    const cx = width / 2;
    const cy = height * 0.48; // Tiphareth center, aligned with the foliage split
    const dx = 60; // Horizontal spread
    const dy = height * 0.06; // Vertical spread dynamically scaling with screen height
    
    return [
      { id: '1_kether', x: cx, y: cy - dy * 2.5, color: '#FFFFFF', name: 'Kether' }, // Unidad
      { id: '2_chokmah', x: cx + dx, y: cy - dy * 1.5, color: '#D4AF37', name: 'Chokmah' }, // Sabiduría
      { id: '3_binah', x: cx - dx, y: cy - dy * 1.5, color: '#333333', name: 'Binah' }, // Comprensión
      { id: '4_chesed', x: cx + dx, y: cy - dy * 0.5, color: '#4287f5', name: 'Chesed' }, // Compasión
      { id: '5_geburah', x: cx - dx, y: cy - dy * 0.5, color: '#f54242', name: 'Geburah' }, // Severidad
      { id: '6_tiphareth', x: cx, y: cy, color: '#F2C94C', name: 'Tiphareth' }, // Ecuanimidad
      { id: '7_netzach', x: cx + dx, y: cy + dy, color: '#42f5a4', name: 'Netzach' }, // Éxito
      { id: '8_hod', x: cx - dx, y: cy + dy, color: '#f59342', name: 'Hod' }, // Autoexpresión
      { id: '9_yesod', x: cx, y: cy + dy * 1.8, color: '#9C78E4', name: 'Yesod' }, // Feminidad/Fundación
      { id: '10_malkuth', x: cx, y: cy + dy * 2.8, color: '#8B4513', name: 'Malkuth' }, // Masculinidad/Raíz
    ];
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Fondo Noche */}
      <Image
        source={require('../../assets/images/zengarden-bg.png')}
        style={[styles.bgImage, { opacity: isDayTime ? 0 : 1 }]}
        resizeMode="cover"
      />
      {/* Fondo Día */}
      <Image
        source={require('../../assets/images/zengarden-bg-day.png')}
        style={[styles.bgImage, { opacity: isDayTime ? 1 : 0 }]}
        resizeMode="cover"
      />

      <Canvas style={StyleSheet.absoluteFill}>
        {/* MODO ZION: Lluvia Digital y Estructuras Vectoriales */}
        {isZionMode && (
          <Group>
            {/* Lluvia Matrix - Grupo A (Rápido) */}
            <Group transform={rainTransformA}>
              <Line p1={vec(width * 0.08, 0)} p2={vec(width * 0.08, 120)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.08, 0)} end={vec(width * 0.08, 120)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.38, 0)} p2={vec(width * 0.38, 160)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.38, 0)} end={vec(width * 0.38, 160)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.68, 0)} p2={vec(width * 0.68, 100)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.68, 0)} end={vec(width * 0.68, 100)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.90, 0)} p2={vec(width * 0.90, 140)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.90, 0)} end={vec(width * 0.90, 140)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
            </Group>

            {/* Lluvia Matrix - Grupo B (Medio) */}
            <Group transform={rainTransformB}>
              <Line p1={vec(width * 0.18, 0)} p2={vec(width * 0.18, 140)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.18, 0)} end={vec(width * 0.18, 140)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.48, 0)} p2={vec(width * 0.48, 100)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.48, 0)} end={vec(width * 0.48, 100)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.78, 0)} p2={vec(width * 0.78, 180)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.78, 0)} end={vec(width * 0.78, 180)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.96, 0)} p2={vec(width * 0.96, 120)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.96, 0)} end={vec(width * 0.96, 120)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
            </Group>

            {/* Lluvia Matrix - Grupo C (Lento) */}
            <Group transform={rainTransformC}>
              <Line p1={vec(width * 0.03, 0)} p2={vec(width * 0.03, 100)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.03, 0)} end={vec(width * 0.03, 100)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.28, 0)} p2={vec(width * 0.28, 180)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.28, 0)} end={vec(width * 0.28, 180)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.58, 0)} p2={vec(width * 0.58, 120)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.58, 0)} end={vec(width * 0.58, 120)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
              <Line p1={vec(width * 0.84, 0)} p2={vec(width * 0.84, 150)} strokeWidth={1.5} color="rgba(0, 255, 100, 0.7)">
                <LinearGradient start={vec(width * 0.84, 0)} end={vec(width * 0.84, 150)} colors={['rgba(0, 255, 100, 0.0)', 'rgba(0, 255, 100, 0.6)']} />
              </Line>
            </Group>

            {/* Montañas Vectoriales Esquemáticas */}
            <Path path={zionMountains.p1} color="rgba(0, 245, 255, 0.15)" style="stroke" strokeWidth={1.5} />
            <Path path={zionMountains.p2} color="rgba(0, 255, 100, 0.25)" style="stroke" strokeWidth={2.0} />

            {/* Cuadrícula de Suelo 3D */}
            <Line p1={vec(0, height * 0.65)} p2={vec(width, height * 0.65)} color="rgba(0, 255, 100, 0.2)" strokeWidth={1} />
            <Line p1={vec(0, height * 0.70)} p2={vec(width, height * 0.70)} color="rgba(0, 255, 100, 0.22)" strokeWidth={1} />
            <Line p1={vec(0, height * 0.77)} p2={vec(width, height * 0.77)} color="rgba(0, 255, 100, 0.24)" strokeWidth={1} />
            <Line p1={vec(0, height * 0.85)} p2={vec(width, height * 0.85)} color="rgba(0, 255, 100, 0.26)" strokeWidth={1.2} />
            <Line p1={vec(0, height * 0.94)} p2={vec(width, height * 0.94)} color="rgba(0, 255, 100, 0.28)" strokeWidth={1.5} />

            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * -0.2, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />
            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * 0.1, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />
            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * 0.3, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />
            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * 0.5, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />
            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * 0.7, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />
            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * 0.9, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />
            <Line p1={vec(width / 2, height * 0.65)} p2={vec(width * 1.2, height)} color="rgba(0, 255, 100, 0.15)" strokeWidth={1} />

            {/* Raíces de circuito cibernético */}
            {zionRoots.map((rootPath, idx) => (
              <Path key={`root-${idx}`} path={rootPath} color={idx % 2 === 0 ? "#00ffcc" : "#00ff66"} style="stroke" strokeWidth={1.5}>
                <BlurMask blur={3} style="normal" />
              </Path>
            ))}

            {/* Tronco de bus de circuito */}
            <Path path={zionTrunkPaths.center} color="#00ffcc" style="stroke" strokeWidth={2}>
              <BlurMask blur={4} style="normal" />
            </Path>
            <Path path={zionTrunkPaths.left} color="#00ff66" style="stroke" strokeWidth={1.2} />
            <Path path={zionTrunkPaths.right} color="#00f0ff" style="stroke" strokeWidth={1.2} />

            {/* 22 Caminos Sefiróticos (Circuitos de Interconexión) */}
            {sephirotConnections.map(([i, j], index) => {
              const p1 = sephirotNodes[i];
              const p2 = sephirotNodes[j];
              if (!p1 || !p2) return null;
              return (
                <Line
                  key={`connection-${index}`}
                  p1={vec(p1.x, p1.y)}
                  p2={vec(p2.x, p2.y)}
                  color="rgba(0, 245, 255, 0.35)"
                  style="stroke"
                  strokeWidth={1.5}
                >
                  <BlurMask blur={2} style="normal" />
                </Line>
              );
            })}
          </Group>
        )}

        {/* Renderizado de Nodos de Flora (Semillas y Plantas) */}
        {floraPositions.map((f, index) => {
          let color = '#7BC676'; // herb (verde)
          if (f.type === 'cactus') color = '#D66D6D'; // cactus (rojo)
          if (f.type === 'lotus') color = '#9C78E4';  // loto (púrpura)
          if (f.type === 'seed') color = '#F2C94C';   // semilla (dorado)

          if (isZionMode) {
            const size = 6 + (f.status === 'mature' ? 3 : 0);
            return (
              <Group key={f.id} transform={[{ translateX: f.x }, { translateY: f.y }]}>
                <Rect x={-size/2} y={-size/2} width={size} height={size} color="#00ff66">
                  <BlurMask blur={5} style="normal" />
                </Rect>
                <Rect x={-1.5} y={-1.5} width={3} height={3} color="#FFFFFF" />
              </Group>
            );
          }

          // Map category to color
          let badgeColor = color;
          if (f.category) {
            switch (f.category) {
              case 'familia':
                badgeColor = '#d3a6d8'; // Lilac/Pink
                break;
              case 'ciencia':
                badgeColor = '#5c84a8'; // Blue
                break;
              case 'ecologia':
                badgeColor = '#7da885'; // Sage Green
                break;
              case 'trabajo':
                badgeColor = '#f2c94c'; // Amber/Gold
                break;
              case 'salud':
                badgeColor = '#d96c6c'; // Coral/Red
                break;
              case 'introspeccion':
                badgeColor = '#cccccc'; // Grey/Cream
                break;
            }
          }

          const radius = 6 + (f.status === 'mature' ? 2 : 0);

          return (
            <Group key={f.id} transform={[{ translateX: f.x }, { translateY: f.y }]}>
              {/* Outer Badge Border */}
              <Circle cx={0} cy={0} r={radius + 3} color={badgeColor} style="stroke" strokeWidth={1} opacity={0.8} />
              
              {/* Inner Circle */}
              <Circle cx={0} cy={0} r={radius} color={badgeColor}>
                <BlurMask blur={8} style="normal" />
              </Circle>
              <Circle cx={0} cy={0} r={2} color="#FFF" />
              
              {/* Badge Label Text */}
              {f.label && defaultFont && (
                <Text
                  x={- (defaultFont.getTextWidth(f.label) / 2)}
                  y={radius + 12}
                  text={f.label}
                  font={defaultFont}
                  color={isDayTime ? '#555555' : '#DDDDDD'}
                />
              )}
            </Group>
          );
        })}

        {/* Renderizado de Nodos Sephirot */}
        {sephirotNodes.map((node) => {
          const nodeOpacity = 0.6 + (illumination * 0.4);
          
          if (isZionMode) {
            return (
              <Group key={node.id} transform={[{ translateX: node.x }, { translateY: node.y }]}>
                {/* Círculo de pulso electromagnético */}
                <Circle cx={0} cy={0} r={pulseRadius} color={node.color} opacity={pulseOpacity}>
                  <BlurMask blur={4} style="normal" />
                </Circle>
                {/* Anillo exterior */}
                <Circle cx={0} cy={0} r={8} color={node.color} style="stroke" strokeWidth={1.5} opacity={0.9} />
                {/* Centro de luz */}
                <Circle cx={0} cy={0} r={2.5} color="#FFFFFF" />
              </Group>
            );
          }

          return (
            <Group key={node.id} transform={[{ translateX: node.x }, { translateY: node.y }]}>
              <Circle cx={0} cy={0} r={12} color={`${node.color}${Math.floor(nodeOpacity * 255).toString(16)}`}>
                <BlurMask blur={8} style="normal" />
              </Circle>
              <Circle cx={0} cy={0} r={3} color="#FFFFFF">
                <BlurMask blur={2} style="normal" />
              </Circle>
            </Group>
          );
        })}
      </Canvas>
      
      {/* Indicador de Throttling Debug */}
      {/* <View style={styles.debugPanel}>
        <Text style={styles.debugText}>FPS Target: {currentFPS}</Text>
        <Text style={styles.debugText}>Gen: {isStreaming ? 'ON' : 'OFF'}</Text>
      </View> */}

    </View>
  );
};

const styles = StyleSheet.create({
  bgImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  debugPanel: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  }
});
