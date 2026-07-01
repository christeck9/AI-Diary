import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { CalendarEvent } from '../db/calendarSchema';

export function useCalendar() {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync<CalendarEvent>(`
        SELECT * FROM calendar_events 
        ORDER BY date ASC, start_time ASC
      `);
      setEvents(result);
    } catch (e) {
      console.error('[useCalendar] Error fetching calendar events:', e);
    }
  }, [db]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (date: string, startTime: string, endTime: string | null, message: string) => {
    if (!db) return;
    try {
      await db.runAsync(
        "INSERT INTO calendar_events (date, start_time, end_time, message, created_at) VALUES (?, ?, ?, ?, ?)",
        [date, startTime, endTime, message, Date.now()]
      );
      await fetchEvents();
    } catch (e) {
      console.error('[useCalendar] Error adding calendar event:', e);
    }
  };

  const removeEvent = async (id: number) => {
    if (!db) return;
    try {
      await db.runAsync("DELETE FROM calendar_events WHERE id = ?", [id]);
      await fetchEvents();
    } catch (e) {
      console.error('[useCalendar] Error removing calendar event:', e);
    }
  };

  return {
    events,
    addEvent,
    removeEvent,
    refreshEvents: fetchEvents,
  };
}
