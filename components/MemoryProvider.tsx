import React from 'react';
import { SQLiteProvider, useSQLiteContext as useRealSQLiteContext } from 'expo-sqlite';
import { initializeDatabase } from '../lib/db';
import { View, Text, Button } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as SplashScreen from 'expo-splash-screen';

class DBErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[DBErrorBoundary] caught an error:", error, errorInfo);
    SplashScreen.hideAsync().catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#000'}}>
          <Text style={{color: '#ff4444', fontSize: 18, marginBottom: 10, textAlign: 'center'}}>
            Database Corruption Detected
          </Text>
          <Text style={{color: 'gray', marginBottom: 20, textAlign: 'center'}}>
            Auto-Backup may have restored an incompatible database.
          </Text>
          <Text style={{color: '#888', marginBottom: 30, textAlign: 'center', fontSize: 12}}>
            {this.state.error?.message}
          </Text>
          <Button title="DESTROY DATABASE & RESTART" color="#ff4444" onPress={async () => {
            try {
              const dbDir = `${FileSystem.documentDirectory}SQLite`;
              await FileSystem.deleteAsync(`${dbDir}/gemma_memory.db`, { idempotent: true });
              await FileSystem.deleteAsync(`${dbDir}/gemma_memory.db-wal`, { idempotent: true });
              await FileSystem.deleteAsync(`${dbDir}/gemma_memory.db-shm`, { idempotent: true });
              this.setState({ hasError: false, error: null });
            } catch (e) {
              console.error(e);
            }
          }} />
        </View>
      );
    }
    return this.props.children;
  }
}

export const MemoryProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <DBErrorBoundary>
      <SQLiteProvider databaseName="gemma_memory.db" onInit={initializeDatabase}>
        {children}
      </SQLiteProvider>
    </DBErrorBoundary>
  );
};

export const useSQLiteContext = useRealSQLiteContext;
