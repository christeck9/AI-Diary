import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useSQLiteContext } from './MemoryProvider';

interface AuditRecord {
  id: number;
  query: string;
  raw_results: string;
  intent: string;
  ttfb: number;
  payload_size: number;
  timestamp: number;
}

interface SentinelTraceBufferProps {
  isActive: boolean;
}

export const SentinelTraceBuffer = ({ isActive }: SentinelTraceBufferProps) => {
  const db = useSQLiteContext();
  const [logs, setLogs] = useState<AuditRecord[]>([]);

  useEffect(() => {
    if (!isActive || !db) {
      setLogs([]);
      return;
    }
    
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        const result = await db.getAllAsync<AuditRecord>(
          'SELECT * FROM sentinel_audit ORDER BY timestamp DESC LIMIT 10'
        );
        if (isMounted) setLogs(result);
      } catch (error) {
        console.error("[SENTINEL TRACE] Error:", error);
      }
    };

    fetchLogs();
    const intervalId = setInterval(fetchLogs, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [db, isActive]);

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <ActivityIndicator size="small" color="#00ffcc" animating={isActive} />
        <Text style={styles.headerTitle}>SENTINEL TRACE</Text>
      </View>
      {logs.length === 0 ? (
        <Text style={styles.emptyText}>Esperando actividad autónoma del agente...</Text>
      ) : (
        <ScrollView style={styles.listContent}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.headerRow}>
                <Text style={styles.intentBadge}>{log.intent}</Text>
                <Text style={styles.timeText}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
              </View>
              <View style={styles.queryRow}>
                <Text style={styles.queryText}>🔍 {log.query}</Text>
                <Text style={styles.metricsText}>
                  {log.ttfb || 0}ms | {((log.payload_size || 0) / 1024).toFixed(1)}KB
                </Text>
              </View>
              <Text style={styles.resultText} numberOfLines={2}>
                {log.raw_results ? log.raw_results.replace(/---[\s\S]*/, '').trim() : 'No results'}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 120,
    backgroundColor: 'rgba(10, 15, 20, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 204, 0.3)',
    padding: 8,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    color: '#00ffcc',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  listContent: {
    flex: 1,
  },
  logCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    padding: 6,
    marginBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#00ffcc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  intentBadge: {
    color: '#000',
    backgroundColor: '#00ffcc',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 8,
  },
  queryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  queryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 5,
  },
  metricsText: {
    color: '#00ffcc',
    fontSize: 8,
    fontWeight: 'bold',
  },
  resultText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    fontStyle: 'italic',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
  }
});