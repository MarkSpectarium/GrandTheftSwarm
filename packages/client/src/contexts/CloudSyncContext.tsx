/**
 * CloudSyncContext
 *
 * Manages cloud save synchronization and conflict resolution.
 * Automatically syncs when user logs in and handles save conflicts.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useGame } from './GameContext';
import { EventBus } from '../core/EventBus';
import { SaveConflictModal, type SaveConflictInfo } from '../components/SaveConflictModal';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'conflict';

interface CloudSyncContextValue {
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  syncToCloud: () => Promise<void>;
  isSyncing: boolean;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

interface CloudSyncProviderProps {
  children: ReactNode;
}

export function CloudSyncProvider({ children }: CloudSyncProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const { game } = useGame();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [conflict, setConflict] = useState<SaveConflictInfo | null>(null);
  const [hasInitialSynced, setHasInitialSynced] = useState(false);

  // Use ref to track conflict detection (synchronous, no stale closure issues)
  const conflictDetectedRef = useRef(false);

  // Handle conflict events from SaveSystem
  useEffect(() => {
    const handleConflict = (info: { localSave: unknown; cloudSave: unknown; localTimestamp: number; cloudTimestamp: number }) => {
      console.log('CloudSync: Conflict detected', info);
      conflictDetectedRef.current = true; // Set ref synchronously
      setSyncStatus('conflict');
      // Cast the event payload to SaveConflictInfo (types match at runtime)
      setConflict(info as unknown as SaveConflictInfo);
    };

    const handleSyncSuccess = () => {
      setSyncStatus('synced');
      setLastSyncedAt(Date.now());
    };

    const handleSyncError = () => {
      setSyncStatus('error');
    };

    const unsubConflict = EventBus.on('cloud:sync:conflict', handleConflict);
    const unsubSuccess = EventBus.on('cloud:sync:success', handleSyncSuccess);
    const unsubLoadSuccess = EventBus.on('cloud:load:success', handleSyncSuccess);
    const unsubError = EventBus.on('cloud:sync:error', handleSyncError);

    return () => {
      unsubConflict();
      unsubSuccess();
      unsubLoadSuccess();
      unsubError();
    };
  }, []);

  // Sync on login
  useEffect(() => {
    if (isAuthenticated && user && game && !hasInitialSynced) {
      console.log('CloudSync: User authenticated, attempting cloud sync');
      setSyncStatus('syncing');
      setHasInitialSynced(true);
      conflictDetectedRef.current = false; // Reset before sync

      game.loadFromCloud().then((success) => {
        if (success) {
          console.log('CloudSync: Successfully loaded from cloud');
          // Success is handled by event listener
        } else if (!conflictDetectedRef.current) {
          // loadFromCloud returns false on conflict (conflict ref is set)
          // or if no cloud save exists - in which case, upload local
          console.log('CloudSync: No cloud save found, uploading local');
          game.syncToCloud().then((syncSuccess) => {
            if (syncSuccess) {
              setSyncStatus('synced');
              setLastSyncedAt(Date.now());
            }
          });
        }
        // If conflictDetectedRef.current is true, conflict modal will show
      }).catch((error) => {
        console.error('CloudSync: Failed to sync', error);
        setSyncStatus('error');
      });
    }
  }, [isAuthenticated, user, game, hasInitialSynced]);

  // Reset sync state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setHasInitialSynced(false);
      setSyncStatus('idle');
      setConflict(null);
    }
  }, [isAuthenticated]);

  // Manual sync
  const syncToCloud = useCallback(async () => {
    if (!game || !isAuthenticated) return;

    setSyncStatus('syncing');
    try {
      const success = await game.syncToCloud();
      if (success) {
        setSyncStatus('synced');
        setLastSyncedAt(Date.now());
      }
    } catch (error) {
      console.error('CloudSync: Manual sync failed', error);
      setSyncStatus('error');
    }
  }, [game, isAuthenticated]);

  // Handle user choosing local save
  const handleChooseLocal = useCallback(async () => {
    if (!game || !conflict) return;

    console.log('CloudSync: User chose local save');
    setSyncStatus('syncing');
    setConflict(null);

    try {
      const success = await game.forceUploadToCloud();
      if (success) {
        setSyncStatus('synced');
        setLastSyncedAt(Date.now());
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('CloudSync: Failed to upload local save', error);
      setSyncStatus('error');
    }
  }, [game, conflict]);

  // Handle user choosing cloud save
  const handleChooseCloud = useCallback(() => {
    if (!game || !conflict) return;

    console.log('CloudSync: User chose cloud save');
    setSyncStatus('syncing');

    const success = game.forceLoadFromCloud(conflict.cloudSave);
    setConflict(null);

    if (success) {
      setSyncStatus('synced');
      setLastSyncedAt(Date.now());
    } else {
      setSyncStatus('error');
    }
  }, [game, conflict]);

  const value: CloudSyncContextValue = {
    syncStatus,
    lastSyncedAt,
    syncToCloud,
    isSyncing: syncStatus === 'syncing',
  };

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
      {conflict && (
        <SaveConflictModal
          conflict={conflict}
          onChooseLocal={handleChooseLocal}
          onChooseCloud={handleChooseCloud}
        />
      )}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync(): CloudSyncContextValue {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error('useCloudSync must be used within a CloudSyncProvider');
  }
  return context;
}
