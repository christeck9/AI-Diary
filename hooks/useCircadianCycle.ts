import { useState, useEffect } from 'react';

export function useCircadianCycle() {
  const [isDayTime, setIsDayTime] = useState(true);

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      // Día: de 6:00 AM a 6:00 PM (18:00)
      setIsDayTime(hour >= 6 && hour < 18);
    };

    checkTime();
    // Revisar cada minuto
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return { isDayTime };
}
