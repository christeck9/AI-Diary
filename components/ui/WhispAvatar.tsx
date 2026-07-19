import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Circle, Group, Path, Skia, BlurMask, RadialGradient, vec } from '@shopify/react-native-skia';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useDerivedValue,
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay,
  withSpring,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';

interface WhispAvatarProps {
  status?: 'idle' | 'thinking' | 'tired' | 'happy' | 'listening' | 'speaking';
  size?: number;
}

export const WhispAvatar = ({ status = 'idle', size = 120 }: WhispAvatarProps) => {
  const BASE_SIZE = 120;
  const center = BASE_SIZE / 2;
  const scale = size / BASE_SIZE;

  // Reanimated shared values
  const time = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const eyeScaleY = useSharedValue(1);
  const eyeScaleX = useSharedValue(1);
  const mouthCurve = useSharedValue(0.5); // Default a small smile (0.5)
  const flicker = useSharedValue(1); // Rapid flickering for the flame

  // Hand Targets
  const leftHandTargetX = useSharedValue(center - 35);
  const leftHandTargetY = useSharedValue(center + 15);
  const rightHandTargetX = useSharedValue(center + 35);
  const rightHandTargetY = useSharedValue(center + 15);

  useEffect(() => {
    // Float and Pulse based on status
    let floatDuration = 2000;
    let pulseDuration = 1500;
    let targetMouth = 0.5; // Small smile
    let targetEyeX = 1;
    let targetLeftHandX = center - 35;
    let targetLeftHandY = center + 15;
    let targetRightHandX = center + 35;
    let targetRightHandY = center + 15;

    if (status === 'thinking') {
      floatDuration = 1000;
      pulseDuration = 800;
      targetMouth = 0; // Neutral line
      targetEyeX = 0.8; // Squinting
      // Ambas manitas apoyadas en los extremos de los cachetes (sobresaliendo un tercio)
      targetLeftHandX = center - 26;
      targetLeftHandY = center + 10;
      targetRightHandX = center + 26;
      targetRightHandY = center + 10;
    } else if (status === 'tired') {
      floatDuration = 4000;
      pulseDuration = 3000;
      targetMouth = -0.5; // Sad
      targetEyeX = 1;
      targetLeftHandX = center - 25;
      targetLeftHandY = center + 30;
      targetRightHandX = center + 25;
      targetRightHandY = center + 30;
    } else if (status === 'happy') {
      floatDuration = 1500;
      pulseDuration = 1200;
      targetMouth = 1.2; // Big Smile
      targetEyeX = 1.1; // Wide eyes
      targetLeftHandX = center - 35;
      targetLeftHandY = center - 5;
      targetRightHandX = center + 35;
      targetRightHandY = center - 5;
    } else if (status === 'listening') {
      floatDuration = 800;
      pulseDuration = 600;
      targetMouth = 0.2; // Slightly open, attentive
      targetEyeX = 1.3; // Very wide eyes — paying close attention
      // Both hands raised forward/up as if leaning in
      targetLeftHandX = center - 20;
      targetLeftHandY = center - 5;
      targetRightHandX = center + 20;
      targetRightHandY = center - 5;
    } else if (status === 'speaking') {
      floatDuration = 900;
      pulseDuration = 700;
      targetMouth = 1.0; // Wide open mouth (talking)
      targetEyeX = 1.2; // Bright, energetic eyes
      // Left hand at normal low position, right hand raised high
      targetLeftHandX = center - 35;
      targetLeftHandY = center + 15;
      targetRightHandX = center + 32;
      targetRightHandY = center - 20; // Raised hand bubble
    }

    if (status === 'thinking') {
      // FREEZE ANIMATIONS: Pausa absoluta para ahorrar CPU/GPU mientras la IA calcula
      cancelAnimation(time);
      pulseValue.value = withTiming(1, { duration: 500 });
      flicker.value = withTiming(1, { duration: 500 });
    } else {
      // Resume continuous time and animations
      time.value = withRepeat(
        withTiming(time.value + 2000, { duration: 1000000, easing: Easing.linear }),
        -1,
        true
      );
      
      // Breathe / Pulse
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(0.95, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.05, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Flame Flickering (very rapid small jitter)
      flicker.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 60 }),
          withTiming(0.95, { duration: 40 }),
          withTiming(1.1, { duration: 80 }),
          withTiming(0.9, { duration: 50 })
        ),
        -1,
        true
      );
    }

    // Mouth and Eye expressions
    mouthCurve.value = withTiming(targetMouth, { duration: 500 });
    eyeScaleX.value = withTiming(targetEyeX, { duration: 500 });

    // Hand Cinemetics
    const springConfig = { damping: 14, stiffness: 90 };
    leftHandTargetX.value = withSpring(targetLeftHandX, springConfig);
    leftHandTargetY.value = withSpring(targetLeftHandY, springConfig);
    rightHandTargetX.value = withSpring(targetRightHandX, springConfig);
    rightHandTargetY.value = withSpring(targetRightHandY, springConfig);

    // Autonomous Blinking
    eyeScaleY.value = withRepeat(
      withSequence(
        withDelay(3000 + Math.random() * 2000, withTiming(0.1, { duration: 100 })),
        withTiming(1, { duration: 100 })
      ),
      -1,
      false
    );
  }, [status]);

  // Semi-random hovering math equation using Lissajous curves
  const floatX = useDerivedValue(() => {
    let speed = 0.5; // Slower, wider horizontal sweeps
    let amplitude = 40; // Much wider horizontal movement to use all side space
    if (status === 'thinking') { speed = 1.5; amplitude = 10; }
    if (status === 'tired') { speed = 0.3; amplitude = 50; }
    if (status === 'happy') { speed = 1.0; amplitude = 45; }
    if (status === 'listening') { speed = 0.4; amplitude = 5; } // Nearly still, focused
    if (status === 'speaking') { speed = 1.2; amplitude = 30; } // Active side-to-side
    
    // Sum of sine waves with irrational frequency ratios creates a non-repeating semi-random pattern
    const t = time.value * speed;
    return Math.sin(t * 1.3) * (amplitude * 0.7) + Math.cos(t * 2.1) * (amplitude * 0.3);
  });

  const floatY = useDerivedValue(() => {
    let speed = 0.8;
    let amplitude = 8; // Keep vertical movement tighter so it doesn't clip top/bottom
    if (status === 'thinking') { speed = 2; amplitude = 4; }
    if (status === 'tired') { speed = 0.4; amplitude = 12; }
    if (status === 'happy') { speed = 1.5; amplitude = 15; } // Bounces more when happy
    if (status === 'listening') { speed = 0.6; amplitude = 3; } // Minimal vertical — attentive lean
    if (status === 'speaking') { speed = 2.0; amplitude = 18; } // Bounces a lot while speaking
    
    const t = time.value * speed;
    return Math.cos(t * 1.5) * (amplitude * 0.6) + Math.sin(t * 2.7) * (amplitude * 0.4);
  });

  // Hand autonomous noise transformations
  const leftHandTransform = useDerivedValue(() => {
    const t = time.value * 2;
    const noiseX = Math.sin(t * 1.5) * 3;
    const noiseY = Math.cos(t * 2.3) * 3;
    return [
      { translateX: leftHandTargetX.value + noiseX },
      { translateY: leftHandTargetY.value + noiseY }
    ];
  });
  
  const rightHandTransform = useDerivedValue(() => {
    const t = time.value * 2;
    const noiseX = Math.cos(t * 1.7) * 3;
    const noiseY = Math.sin(t * 2.1) * 3;
    return [
      { translateX: rightHandTargetX.value + noiseX },
      { translateY: rightHandTargetY.value + noiseY }
    ];
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: floatX.value },
      { translateY: floatY.value },
      { scale: pulseValue.value }
    ]
  }));

  // Static path definitions constructed once to avoid native object leaks on UI thread
  const topTipPath = useMemo(() => {
    const p = Skia.Path.Make();
    // Tip at (center - 5, center - 35), tapering down to merge with the circle base
    p.moveTo(center - 5, center - 35);
    p.cubicTo(
      center + 18, center - 15,
      center + 24, center + 5,
      center, center + 15
    );
    p.cubicTo(
      center - 24, center + 5,
      center - 18, center - 15,
      center - 5, center - 35
    );
    p.close();
    return p;
  }, [center]);

  const leftTipPath = useMemo(() => {
    const p = Skia.Path.Make();
    // Secondary tip branching up-left like the original design
    p.moveTo(center - 25, center - 20);
    p.cubicTo(
      center - 5, center - 5,
      center, center + 10,
      center, center + 15
    );
    p.cubicTo(
      center - 20, center + 10,
      center - 25, center,
      center - 25, center - 20
    );
    p.close();
    return p;
  }, [center]);

  // Derived values for scale and breathing effects
  const auraScale = useDerivedValue(() => {
    return pulseValue.value * (1 + 0.08 * Math.sin(time.value * 0.15));
  });

  const auraRadius = useDerivedValue(() => {
    return (BASE_SIZE * 0.40) * auraScale.value;
  });

  // Dynamic GPU-accelerated group transforms (NO memory allocation at 60fps)
  const mainFlameTransform = useDerivedValue(() => {
    const s = pulseValue.value;
    const jitterX = Math.sin(time.value * 5) * 1.0;
    const jitterY = Math.cos(time.value * 4) * 0.8;
    return [
      { translateX: jitterX },
      { translateY: jitterY },
      { scaleX: s },
      { scaleY: s },
    ];
  });

  const topTipTransform = useDerivedValue(() => {
    // Top tip flickers and wiggles slightly
    const sX = 1 + flicker.value * 0.04;
    const sY = 1 + flicker.value * 0.08;
    const rotation = Math.sin(time.value * 8) * 0.03;
    return [
      { rotate: rotation },
      { scaleX: sX },
      { scaleY: sY },
    ];
  });

  const leftTipTransform = useDerivedValue(() => {
    // Left tip wiggles independently
    const sX = 0.9 + flicker.value * 0.05;
    const sY = 0.9 + flicker.value * 0.06;
    const rotation = Math.cos(time.value * 7) * 0.05;
    return [
      { rotate: rotation },
      { scaleX: sX },
      { scaleY: sY },
    ];
  });

  // Mouth path calculation
  const [mouthPath, setMouthPath] = useState(Skia.Path.Make());

  useEffect(() => {
    let target = 0.5; // Small smile
    if (status === 'happy') target = 1.2;
    if (status === 'tired') target = -0.5;
    if (status === 'thinking') target = 0;
    if (status === 'listening') target = 0.2; // Slightly open
    if (status === 'speaking') target = 1.0; // Wide, open mouth
    
    const path = Skia.Path.Make();
    const startX = center - 8;
    const endX = center + 8;
    let startY = center + 12;
    let endY = center + 12;
    let cpY = startY + (target * 8);

    // Si está pensando, hacemos que la boca sea una línea diagonal \
    if (status === 'thinking') {
      startY = center + 10;
      endY = center + 14;
      cpY = center + 12; // Línea recta entre los dos puntos
    }

    // Si está hablando, boca de tipo óvalo abierto (tipo sorprendido/hablando)
    if (status === 'speaking') {
      const speakStartX = center - 6;
      const speakEndX = center + 6;
      path.moveTo(speakStartX, center + 12);
      path.quadTo(center, center + 6, speakEndX, center + 12);
      path.quadTo(center, center + 18, speakStartX, center + 12);
      path.close();
      setMouthPath(path);
      return;
    }

    path.moveTo(startX, startY);
    path.quadTo(center, cpY, endX, endY);
    setMouthPath(path);
  }, [status]);

  const containerHeight = Math.round(size * 0.85);

  const sweatDropSVG = Skia.Path.MakeFromSVGString(
    `M ${center+18} ${center-10} C ${center+23} ${center-4} ${center+23} ${center+2} ${center+18} ${center+2} C ${center+13} ${center+2} ${center+13} ${center-4} ${center+18} ${center-10} Z`
  );

  return (
    <Animated.View style={[styles.container, { width: size, height: containerHeight }, animatedStyle]}>
      <Canvas style={{ width: size, height: containerHeight }}>
        <Group transform={[{ scale }]}>
          {/* Outer Aura (Intelligent Glow Sphere) */}
          <Circle cx={center} cy={center} r={auraRadius}>
            <RadialGradient c={vec(center, center)} r={BASE_SIZE * 0.45} colors={['rgba(0, 150, 255, 0.4)', 'rgba(0, 50, 255, 0)']} />
            <BlurMask blur={15} style="normal" />
          </Circle>

          {/* Main Body (Breathing and floating together) */}
          <Group origin={vec(center, center + 40)} transform={mainFlameTransform}>
            
            {/* Left wisp tip */}
            <Group origin={vec(center, center + 10)} transform={leftTipTransform}>
              <Path path={leftTipPath}>
                <RadialGradient c={vec(center, center)} r={BASE_SIZE * 0.35} colors={['#88ddff', '#0077ff']} />
                <BlurMask blur={4} style="normal" />
              </Path>
            </Group>

            {/* Top main wisp tip */}
            <Group origin={vec(center, center + 10)} transform={topTipTransform}>
              <Path path={topTipPath}>
                <RadialGradient c={vec(center, center)} r={BASE_SIZE * 0.38} colors={['#88ddff', '#0077ff']} />
                <BlurMask blur={4} style="normal" />
              </Path>
            </Group>

            {/* Chubby Round Base (Circle representing the face) */}
            <Circle cx={center} cy={center + 8} r={32}>
              <RadialGradient c={vec(center, center + 8)} r={BASE_SIZE * 0.35} colors={['#88ddff', '#0077ff']} />
              <BlurMask blur={4} style="normal" />
            </Circle>

            {/* Inner Core (Brighter central core inside the circle) */}
            <Circle cx={center} cy={center + 12} r={16}>
              <RadialGradient c={vec(center, center + 12)} r={BASE_SIZE * 0.18} colors={['#ffffff', 'rgba(100, 200, 255, 0.6)']} />
              <BlurMask blur={6} style="normal" />
            </Circle>

            {/* Face Group (Moves with main body) */}
            <Group>
              {/* Left Eye */}
              <Circle cx={center - 12} cy={center + 2} r={3} color="#ffffff">
                <BlurMask blur={0.5} style="normal" />
              </Circle>
              
              {/* Right Eye */}
              <Circle cx={center + 12} cy={center + 2} r={3} color="#ffffff">
                <BlurMask blur={0.5} style="normal" />
              </Circle>

              {/* Mouth */}
              {status === 'speaking' ? (
                <Path path={mouthPath} color="#ffffff" style="fill">
                  <BlurMask blur={0.5} style="normal" />
                </Path>
              ) : (
                <Path path={mouthPath} color="#ffffff" style="stroke" strokeWidth={1.5} strokeCap="round">
                  <BlurMask blur={0.2} style="normal" />
                </Path>
              )}

              {/* Sweat Drop for Thinking state */}
              {status === 'thinking' && sweatDropSVG && (
                <Path path={sweatDropSVG} color="#88ddff">
                  <BlurMask blur={0.5} style="normal" />
                </Path>
              )}
            </Group>
          </Group>

          {/* Left Hand (Outside body transform so it floats independently) */}
          <Group transform={leftHandTransform}>
            <Circle cx={0} cy={0} r={10}>
              <RadialGradient c={vec(0, 0)} r={12} colors={['rgba(0, 150, 255, 0.6)', 'rgba(0, 50, 255, 0)']} />
              <BlurMask blur={5} style="normal" />
            </Circle>
            <Circle cx={0} cy={0} r={4}>
              <RadialGradient c={vec(0, 0)} r={4} colors={['#ffffff', 'rgba(100, 200, 255, 0.6)']} />
              <BlurMask blur={2} style="normal" />
            </Circle>
          </Group>

          {/* Right Hand */}
          <Group transform={rightHandTransform}>
            <Circle cx={0} cy={0} r={10}>
              <RadialGradient c={vec(0, 0)} r={12} colors={['rgba(0, 150, 255, 0.6)', 'rgba(0, 50, 255, 0)']} />
              <BlurMask blur={5} style="normal" />
            </Circle>
            <Circle cx={0} cy={0} r={4}>
              <RadialGradient c={vec(0, 0)} r={4} colors={['#ffffff', 'rgba(100, 200, 255, 0.6)']} />
              <BlurMask blur={2} style="normal" />
            </Circle>
          </Group>
        </Group>
      </Canvas>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
