import { type SQLiteDatabase } from 'expo-sqlite';
import { incrementBadge, BADGE_CATEGORIES } from '../db/badgeSchema';
import { settingsService } from './SettingsService';

export type BadgeCategory = 'communication' | 'proactivity' | 'productivity' | 'awareness' | 'expert';

const SPANISH_ORDINALS = [
  'primer', 'segundo', 'tercer', 'cuarto', 'quinto',
  'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'
];

const ENGLISH_ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth',
  'sixth', 'seventh', 'eighth', 'ninth', 'tenth'
];

function isFibonacci(num: number): boolean {
  if (num <= 0) return false;
  const isPerfectSquare = (x: number) => {
    const s = Math.round(Math.sqrt(x));
    return s * s === x;
  };
  return isPerfectSquare(5 * num * num + 4) || isPerfectSquare(5 * num * num - 4);
}

export class BadgeService {
  /**
   * Records a user action in a specific category.
   * If the new total action count is a Fibonacci number, awards the badge and returns completion info.
   */
  async recordAction(
    db: SQLiteDatabase,
    category: BadgeCategory,
    count: number = 1
  ): Promise<{
    awarded: boolean;
    badgeId?: BadgeCategory;
    actionCount: number;
    badgeCount?: number;
    emoji?: string;
    spanishCongrats?: string;
    englishCongrats?: string;
  } | null> {
    try {
      // 1. Get current badge progress
      const progress = (await settingsService.get('badge_progress')) || {};
      const currentCount = progress[category] || 0;
      const newCount = currentCount + count;

      // 2. Save updated progress
      await settingsService.set({
        badge_progress: {
          ...progress,
          [category]: newCount,
        },
      });

      console.log(`[BadgeService] Recorded action for ${category}. New action count: ${newCount}`);

      // 3. Check Fibonacci
      if (isFibonacci(newCount)) {
        // Award badge in SQLite
        const badge = await incrementBadge(db, category);
        if (badge) {
          const badgeCount = badge.count; // level (1, 2, 3...)
          const spOrdinal = SPANISH_ORDINALS[badgeCount - 1] || `${badgeCount}°`;
          const enOrdinal = ENGLISH_ORDINALS[badgeCount - 1] || `${badgeCount}th`;

          // Map category for voice message
          let categorySp = '';
          let categoryEn = '';
          if (category === 'communication') {
            categorySp = 'comunicación';
            categoryEn = 'communication';
          } else if (category === 'proactivity') {
            categorySp = 'proactividad';
            categoryEn = 'proactivity';
          } else if (category === 'productivity') {
            categorySp = 'productividad';
            categoryEn = 'productivity';
          } else if (category === 'awareness') {
            categorySp = 'consciencia';
            categoryEn = 'awareness';
          } else if (category === 'expert') {
            categorySp = 'experto';
            categoryEn = 'expertise';
          }

          const spanishCongrats = `¡Felicidades por tu ${spOrdinal} badge de ${categorySp}!`;
          const englishCongrats = `Congratulations on your ${enOrdinal} ${categoryEn} badge!`;

          return {
            awarded: true,
            badgeId: category,
            actionCount: newCount,
            badgeCount,
            emoji: badge.emoji,
            spanishCongrats,
            englishCongrats,
          };
        }
      }

      return {
        awarded: false,
        actionCount: newCount,
      };
    } catch (error) {
      console.error('[BadgeService] Error recording action:', error);
      return null;
    }
  }
}

export const badgeService = new BadgeService();
