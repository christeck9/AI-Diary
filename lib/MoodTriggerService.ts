import { SQLiteDatabase } from 'expo-sqlite';
import { getRecentMoods, getMoodsInTimeframe, getDominantMoodSince, getTotalMoodsSince, logMood, MOOD_TYPES } from '../db/moodSchema';

/**
 * Servicio para evaluar y disparar triggers proactivos de IA 
 * basados en el registro de estados de ánimo del usuario.
 */
export class MoodTriggerService {
  
  /**
   * Procesa la inserción de un nuevo mood y evalúa si se debe detonar algún trigger.
   * Devuelve un string (el prompt/inyección para Anima) si un trigger se activa,
   * o null si no hay trigger que activar.
   */
  static async processMoodAndCheckTriggers(
    db: SQLiteDatabase, 
    moodType: string, 
    messageIdContext?: string,
    lang: string = 'es'
  ): Promise<string | null> {
    // 1. Guardar el mood
    await logMood(db, moodType, messageIdContext);

    // 2. Revisar Trigger Semanal / Periódico (Prioridad Baja pero si se cumple, sobrescribe)
    const periodicTrigger = await this.checkPeriodicTrigger(db, lang);
    if (periodicTrigger) return periodicTrigger;

    // 3. Revisar Racha de 3 (Streak) (Prioridad Alta)
    const streakTrigger = await this.checkStreakTrigger(db, lang);
    if (streakTrigger) return streakTrigger;

    // 4. Revisar Frecuencia (6x en 48 hrs) (Prioridad Media)
    const frequencyTrigger = await this.checkFrequencyTrigger(db, lang);
    if (frequencyTrigger) return frequencyTrigger;

    return null; // Ningún trigger detonado
  }

  private static async checkStreakTrigger(db: SQLiteDatabase, lang: string): Promise<string | null> {
    const recent = await getRecentMoods(db, 3);
    if (recent.length === 3) {
      const firstMood = recent[0].mood_type;
      const allSame = recent.every(m => m.mood_type === firstMood);
      
      if (allSame) {
        // Obtenemos el nombre del mood para pasarlo al LLM
        const moodName = this.getMoodName(firstMood, lang);
        return lang === 'en'
          ? `You've indicated feeling ${moodName} for the last 3 times. Do you want to tell me exactly what's been going on these days?`
          : `Van 3 veces consecutivas que indicas que te sientes ${moodName}. ¿Quieres contarme qué ha estado pasando exactamente estos días?`;
      }
    }
    return null;
  }

  private static async checkFrequencyTrigger(db: SQLiteDatabase, lang: string): Promise<string | null> {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const recentMoods = await getMoodsInTimeframe(db, fortyEightHoursAgo);
    
    // Contar frecuencias
    const counts: Record<string, number> = {};
    for (const m of recentMoods) {
      counts[m.mood_type] = (counts[m.mood_type] || 0) + 1;
    }

    // Si algún mood pasa de 6 (excepto neutral)
    for (const [mood, count] of Object.entries(counts)) {
      if (count >= 6 && mood !== MOOD_TYPES.NEUTRAL) {
        const moodName = this.getMoodName(mood, lang);
        return lang === 'en'
          ? `I noticed that in the last 2 days you've marked ${moodName} ${count} times in total. I feel you've had quite a bit accumulated lately... how is everything going?`
          : `He notado que en los últimos 2 días has marcado ${moodName} ${count} veces en total. Te siento con bastante carga acumulada últimamente... ¿cómo va todo?`;
      }
    }
    return null;
  }

  private static async checkPeriodicTrigger(db: SQLiteDatabase, lang: string): Promise<string | null> {
    // Lógica para revisar si han pasado más de 7 días y si hay al menos 3 mensajes y 3 moods.
    // Buscamos el último resumen o la fecha del primer mood.
    // Para simplificar, revisaremos los últimos 7 días. Si hay más de 3 moods, hacemos el resumen.
    // Nota: Necesitamos un registro de cuándo fue la última vez que detonó el trigger semanal, 
    // pero para esta implementación inicial lo calcularemos basado en si es Sábado/Domingo 
    // y no se ha detonado hoy.
    
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado
    
    // Solo activamos este trigger Sábados o Domingos
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      return null;
    }

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const totalMoods = await getTotalMoodsSince(db, sevenDaysAgo);
    
    // Regla: al menos 3 interacciones de emoji
    if (totalMoods < 3) {
      return null;
    }

    // Si el dominante es válido, lo usamos
    const dominant = await getDominantMoodSince(db, sevenDaysAgo);
    if (!dominant) return null;

    const moodName = this.getMoodName(dominant.mood_type, lang);

    // Obtener un mini resumen de qué han hablado
    // Extraemos las últimas síntesis de memoria
    const synthesis = await db.getFirstAsync<{ summary: string }>(
      'SELECT summary FROM memory_synthesis ORDER BY created_at DESC LIMIT 1;'
    );

    // TODO: Necesitamos asegurar que el trigger solo salta 1 vez por fin de semana.
    // Podríamos guardar en AsyncStorage o en SQLite la fecha del último trigger, pero 
    // lo devolveremos como un sistema base.
    
    // Extraer 3 a 5 palabras clave de la síntesis (esto es un hack rápido, idealmente lo hace el LLM)
    let topicSummary = lang === 'en' ? 'various things' : 'varias cosas';
    if (synthesis && synthesis.summary) {
       // Tomamos las primeras 5 palabras del resumen como tema principal
       topicSummary = synthesis.summary.split(' ').slice(0, 5).join(' ') + '...';
    }

    return lang === 'en'
      ? `I've noticed that over the last week you felt mostly ${moodName} and we were talking about ${topicSummary}. How do you feel about it now that we finished the week?`
      : `He visto que la última semana te sentiste mayormente ${moodName} y estuvimos hablando sobre ${topicSummary}. ¿Cómo te sientes al respecto ahora que terminamos la semana?`;
  }

  private static getMoodName(emoji: string, lang: string): string {
    if (lang === 'en') {
      switch(emoji) {
        case MOOD_TYPES.HAPPY: return 'happy';
        case MOOD_TYPES.NEUTRAL: return 'neutral';
        case MOOD_TYPES.SAD: return 'sad';
        case MOOD_TYPES.ANGRY: return 'angry';
        case MOOD_TYPES.ANXIOUS: return 'anxious';
        default: return 'that way';
      }
    }
    switch(emoji) {
      case MOOD_TYPES.HAPPY: return 'contento(a)';
      case MOOD_TYPES.NEUTRAL: return 'neutral';
      case MOOD_TYPES.SAD: return 'triste';
      case MOOD_TYPES.ANGRY: return 'enojado(a)';
      case MOOD_TYPES.ANXIOUS: return 'ansioso(a)';
      default: return 'de esa manera';
    }
  }
}
