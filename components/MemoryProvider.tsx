import React from 'react';
import { SQLiteProvider, useSQLiteContext as useRealSQLiteContext } from 'expo-sqlite';
import { initializeDatabase } from '../lib/db';
import { View, Text, Button } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SplashScreen from 'expo-splash-screen';

export const MemoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [dbError, setDbError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (dbError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [dbError]);

  if (dbError) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#000'}}>
        <Text style={{color: '#ff4444', fontSize: 18, marginBottom: 10, textAlign: 'center'}}>
          Database Corruption Detected
        </Text>
        <Text style={{color: 'gray', marginBottom: 20, textAlign: 'center'}}>
          Auto-Backup may have restored an incompatible database.
        </Text>
        <Text style={{color: '#888', marginBottom: 30, textAlign: 'center', fontSize: 12}}>
          {dbError.message}
        </Text>
        <Button title="DESTROY DATABASE & RESTART" color="#ff4444" onPress={async () => {
          try {
            const dbDir = `${FileSystem.documentDirectory}SQLite`;
            await FileSystem.deleteAsync(`${dbDir}/gemma_memory.db`, { idempotent: true });
            await FileSystem.deleteAsync(`${dbDir}/gemma_memory.db-wal`, { idempotent: true });
            await FileSystem.deleteAsync(`${dbDir}/gemma_memory.db-shm`, { idempotent: true });
            setDbError(null);
          } catch (e) {
            console.error(e);
          }
        }} />
      </View>
    );
  }

  return (
    <SQLiteProvider 
      databaseName="gemma_memory.db" 
      onInit={initializeDatabase}
      onError={(err) => setDbError(err)}
    >
      {children}
    </SQLiteProvider>
  );
};

export const useSQLiteContext = useRealSQLiteContext;
