import { createContext, useContext, useState, ReactNode } from 'react';

export interface EquipmentData {
  id?: string;
  equipment_name: string;
  equipment_type: string;
  flowrate: number | null;
  pressure: number | null;
  temperature: number | null;
}

export interface Upload {
  id: string;
  filename: string;
  record_count: number;
  summary: {
    avgFlowrate: number;
    avgPressure: number;
    avgTemperature: number;
    typeDistribution: Record<string, number>;
  } | null;
  created_at: string;
}

interface DataContextType {
  currentUpload: Upload | null;
  currentData: EquipmentData[];
  setCurrentUpload: (upload: Upload | null) => void;
  setCurrentData: (data: EquipmentData[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentUpload, setCurrentUpload] = useState<Upload | null>(null);
  const [currentData, setCurrentData] = useState<EquipmentData[]>([]);

  return (
    <DataContext.Provider value={{ currentUpload, currentData, setCurrentUpload, setCurrentData }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
