export type { Store, InventoryItem, TryonAnalytics } from './api';

export type SizeMeasurements = Record<
  string,
  {
    width?: number;
    height?: number;
    waist?: number;
    shoulder?: number;
    chest?: number;
    length?: number;
    sleeve?: number;
    inseam?: number;
  }
>;
