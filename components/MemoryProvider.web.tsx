import React from 'react';

// Mock Provider for Web Development
export const MemoryProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Mock the hook so the web UI doesn't crash when trying to access the DB
export const useSQLiteContext = () => {
  return {
    execAsync: async () => {},
    runAsync: async () => {},
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
  } as any;
};
