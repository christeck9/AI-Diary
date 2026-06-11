import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { TodoItem } from '../db/todoSchema';

export function useTodos() {
  const db = useSQLiteContext();
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const fetchTodos = useCallback(async () => {
    if (!db) {
      console.log('[useTodos] No database instance found during fetch');
      return;
    }
    try {
      console.log('[useTodos] Fetching todos...');
      const result = await db.getAllAsync<TodoItem>(`
        SELECT * FROM todos 
        ORDER BY 
          CASE WHEN target_date IS NOT NULL THEN 0 ELSE 1 END,
          target_date ASC,
          target_time ASC,
          created_at DESC
      `);
      console.log('[useTodos] Fetched todos successfully, count:', result.length);
      setTodos(result);
    } catch (e) {
      console.error('[useTodos] Error fetching todos:', e);
    }
  }, [db]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (text: string, targetDate: string | null, targetTime: string | null) => {
    if (!db) {
      console.log('[useTodos] No database instance found during add');
      return;
    }
    try {
      console.log('[useTodos] Adding todo:', { text, targetDate, targetTime });
      await db.runAsync(
        "INSERT INTO todos (text, target_date, target_time, created_at) VALUES (?, ?, ?, ?)",
        [text, targetDate, targetTime, Date.now()]
      );
      console.log('[useTodos] Todo added successfully to DB. Refreshing...');
      await fetchTodos();
    } catch (e) {
      console.error('[useTodos] Error adding todo:', e);
    }
  };

  const removeTodo = async (id: number) => {
    if (!db) return;
    try {
      console.log('[useTodos] Removing todo with ID:', id);
      await db.runAsync("DELETE FROM todos WHERE id = ?", [id]);
      console.log('[useTodos] Todo removed successfully from DB. Refreshing...');
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
