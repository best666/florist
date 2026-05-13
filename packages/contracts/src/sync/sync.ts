import { SyncDirection, SyncStatus } from '../common/enums';

export interface SyncCheckpoint {
  deviceId: string;
  lastPulledVersion: number;
  lastPushedVersion: number;
  updatedAt: string;
}

export interface SyncMutation<TPayload> {
  mutationId: string;
  entityName: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: TPayload;
  version: number;
  occurredAt: string;
}

export interface SyncRequest<TPayload> {
  checkpoint: SyncCheckpoint;
  direction: SyncDirection;
  mutations: Array<SyncMutation<TPayload>>;
}

export interface SyncConflict<TPayload> {
  entityName: string;
  entityId: string;
  localPayload: TPayload;
  remotePayload: TPayload;
  localVersion: number;
  remoteVersion: number;
}

export interface SyncResponse<TPayload> {
  status: SyncStatus;
  serverVersion: number;
  acceptedMutations: string[];
  conflicts: Array<SyncConflict<TPayload>>;
}
