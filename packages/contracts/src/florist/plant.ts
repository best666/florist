import {
  CareActionType,
  LightExposureType,
  PlacementType,
  PlantCategory,
  PlantStatus,
} from '../common/enums';

export interface PlantPhoto {
  id: string;
  plantId: string;
  localPath: string;
  remoteUrl?: string;
  capturedAt: string;
}

export interface PlantProfile {
  id: string;
  name: string;
  nickname?: string;
  category: PlantCategory;
  purchaseDate?: string;
  purchasePriceCents?: number;
  placement: PlacementType;
  lightExposure: LightExposureType;
  status: PlantStatus;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CareRecord {
  id: string;
  plantId: string;
  action: CareActionType;
  note?: string;
  recordedAt: string;
  canUndoUntil?: string;
}

export interface PlantSuggestion {
  plantId: string;
  title: string;
  content: string;
  generatedAt: string;
  isReferenceOnly: true;
}
