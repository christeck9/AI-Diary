import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { TodoItem } from '../db/todoSchema';

export function useTodos() {
  const db = useSQLiteContext();
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const fetchTodos = useCallback(async () => {
    if (!db) return;
    try {
      const result = await db.getAllAsync<TodoItem>(`
        SELECT * FROM todos 
        ORDER BY 
          CASE WHEN target_date IS NOT NULL THEN 0 ELSE 1 END,
          target_date ASC,
          target_time ASC,
          created_at DESC
      `);
      setTodos(result);
    } catch (e) {
      console.error('[useTodos] Error fetching todos:', e);
    }
  }, [db]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (text: string, targetDate: string | null, targetTime: string | null) => {
    if (!db) return;
    try {
      await db.runAsync(
        "INSERT INTO todos (text, target_date, target_time, created_at) VALUES (?, ?, ?, ?)",
        [text, targetDate, targetTime, Date.now()]
      );
      await fetchTodos();
    } catch (e) {
      console.error('[useTodos] Error adding todo:', e);
    }
  };

  const removeTodo = async (id: number) => {
    if (!db) return;
    try {
      await db.runAsync("DELETE FROM todos WHERE id = ?", [id]);
      await fetchTodos();
    } catch (e) {
      console.error('[useTodos] Error removing todo:', e);
    }
  };

  return {
    todos,
    addTodo,
    removeTodo,
    refreshTodos: fetchTodos,
  };
}
