import { type SQLiteDatabase } from 'expo-sqlite';

export const BADGE_CATEGORIES = [
  { id: 'communication', emoji: '💬', name: 'Comunicación', nameEn: 'Communication' },
  { id: 'proactivity', emoji: '⚡', name: 'Proactividad', nameEn: 'Proactivity' },
  { id: 'productivity', emoji: '🚀', name: 'Productividad', nameEn: 'Productivity' },
  { id: 'awareness', emoji: '👁️', name: 'Consciencia', nameEn: 'Awareness' },
  { id: 'expert', emoji: '🛠️', name: 'Experto', nameEn: 'Expertise' }
];

export async function initializeBadges(db: SQLiteDatabase) {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id TEXT PRIMARY KEY,
        emoji TEXT NOT NULL,
        name TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        last_awarded INTEGER
      );
    `);
    
    // Clean old badges to prevent legacy ones from rendering
    const ids = BADGE_CATEGORIES.map(b => `'${b.id}'`).join(',');
    await db.execAsync(`DELETE FROM user_badges WHERE id NOT IN (${ids})`);
  } catch (error) {
    console.error('[BadgeSchema] Initialization error:', error);
  }
}

export async function incrementBadge(db: SQLiteDatabase, badgeId: string): Promise<{ emoji: string, name: string, count: number } | null> {
  const category = BADGE_CATEGORIES.find(b => b.id === badgeId);
  if (!category) return null;

  try {
    const existing: any[] = await db.getAllAsync('SELECT * FROM user_badges WHERE id = ?', [badgeId]);
    const now = Date.now();
    let newCount = 1;

    if (existing.length > 0) {
      newCount = existing[0].count + 1;
      await db.runAsync(
        'UPDATE user_badges SET count = ?, last_awarded = ? WHERE id = ?',
        [newCount, now, badgeId]
      );
    } else {
      await db.runAsync(
        'INSERT INTO user_badges (id, emoji, name, count, last_awarded) VALUES (?, ?, ?, ?, ?)',
        [badgeId, category.emoji, category.name, 1, now]
      );
    }

    return {
      emoji: category.emoji,
      name: category.name,
      count: newCount
    };
  } catch (error) {
    console.error('[BadgeSchema] Error incrementing badge:', error);
    return null;
  }
}

export async function getAllBadges(db: SQLiteDatabase): Promise<any[]> {
  try {
    const rows = await db.getAllAsync('SELECT * FROM user_badges ORDER BY count DESC, last_awarded DESC');
    return rows;
  } catch (error) {
    console.error('[BadgeSchema] Error getting all badges:', error);
    return [];
  }
}
