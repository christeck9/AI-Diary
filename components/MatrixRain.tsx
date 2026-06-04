import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated } from 'react-native';
import { getTotalRAMValue } from '../lib/MemoryManager';

const { width, height } = Dimensions.get('window');
const COLUMN_COUNT = Math.floor(width / 20);
const CHARS = '0123456789ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

const MatrixColumn = ({ 
  index, 
  paused, 
  isActive, 
  onFinish 
}: { 
  index: number, 
  paused?: boolean, 
  isActive: boolean, 
  onFinish: () => void 
}) => {
  const [chars, setChars] = useState('');
  const moveAnim = useRef(new Animated.Value(-200)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Generate random string once on mount
    let str = '';
    for (let i = 0; i < 20; i++) {
      str += CHARS.charAt(Math.floor(Math.random() * CHARS.length)) + '\n';
    }
    setChars(str);
  }, []);

  useEffect(() => {
    const animate = () => {
      if (paused || !isActive) return;
      
      moveAnim.setValue(-200);
      animationRef.current = Animated.timing(moveAnim, {
        toValue: height,
        duration: 3000 + Math.random() * 5000,
        useNativeDriver: true,
      });
      
      animationRef.current.start(({ finished }) => {
        if (finished) {
          onFinish();
        }
      });
    };

    if (isActive && !paused) {
      animate();
    } else if (animationRef.current) {
      animationRef.current.stop();
    }

    return () => {
      if (animationRef.current) animationRef.current.stop();
    };
  }, [paused, isActive]);

  // Degradación Visual: No renderizar el nodo si no tiene permiso, ahorra RAM
  if (!isActive) return null; 

  return (
    <Animated.View 
      style={[
        styles.column, 
        { left: index * 20, transform: [{ translateY: moveAnim }] }
      ]}
    >
      <Text style={styles.charText}>{chars}</Text>
    </Animated.View>
  );
};

export const MatrixRain = ({ paused }: { paused?: boolean }) => {
  const [activeColumns, setActiveColumns] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (paused) return;

    // Monitor de Oportunidad de Memoria
    const totalRAM = getTotalRAMValue();
    
    // Escala la "oportunidad" según la RAM del dispositivo
    // < 6GB: 1 línea a la vez
    // < 8GB: 3 líneas simultáneas
    // >= 8GB: 8 líneas simultáneas
    const maxSimultaneous = totalRAM < 6000 ? 1 : (totalRAM < 8192 ? 3 : 8);

    const interval = setInterval(() => {
      setActiveColumns(prev => {
        // Si no hay oportunidad (ya llegamos al máximo permitido), no hacemos nada
        if (prev.size >= maxSimultaneous) return prev;
        
        const next = new Set(prev);
        const inactive = [];
        for (let i = 0; i < COLUMN_COUNT; i++) {
          if (!next.has(i)) inactive.push(i);
        }
        
        if (inactive.length > 0) {
          // Otorgamos permiso a una línea aleatoria
          const randomIndex = inactive[Math.floor(Math.random() * inactive.length)];
          next.add(randomIndex);
        }
        return next;
      });
    }, 5000); // Revisar cada 5 segundos, como sugirió el usuario

    return () => clearInterval(interval);
  }, [paused]);

  const handleColumnFinish = (index: number) => {
    setActiveColumns(prev => {
      const next = new Set(prev);
      next.delete(index); // Liberar la ranura para que en la próxima oportunidad caiga otra
      return next;
    });
  };

  const columns = Array.from({ length: COLUMN_COUNT });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {columns.map((_, i) => (
        <MatrixColumn 
          key={i} 
          index={i} 
          paused={paused} 
          isActive={activeColumns.has(i)}
          onFinish={() => handleColumnFinish(i)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    width: 20,
  },
  charText: {
    color: '#00ff41',
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    opacity: 0.3,
  },
});
