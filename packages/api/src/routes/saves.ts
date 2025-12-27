import { Router, type Response } from 'express';
import { db, schema } from '../db/client';
import { eq, desc } from 'drizzle-orm';
import { type AuthenticatedRequest } from '../middleware/auth';
import { calculateOfflineProgress } from '../services/offlineService';
import type { SerializableGameState } from 'shared';

export const savesRouter: Router = Router();

// Save game state
savesRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { version, data, checksum } = req.body as {
    version: string;
    data: SerializableGameState;
    checksum: string;
  };

  if (!version || !data || !checksum) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing required fields: version, data, checksum',
    });
  }

  try {
    // Check for existing save
    const existingSave = await db.query.saves.findFirst({
      where: eq(schema.saves.userId, req.user.id),
      orderBy: [desc(schema.saves.updatedAt)],
    });

    const saveId = existingSave?.id || crypto.randomUUID();
    const now = new Date();

    if (existingSave) {
      // Update existing save
      await db.update(schema.saves)
        .set({
          version,
          data: JSON.stringify(data),
          checksum,
          updatedAt: now,
        })
        .where(eq(schema.saves.id, existingSave.id));
    } else {
      // Create new save
      await db.insert(schema.saves).values({
        id: saveId,
        userId: req.user.id,
        version,
        data: JSON.stringify(data),
        checksum,
      });
    }

    res.json({
      success: true,
      save: {
        id: saveId,
        userId: req.user.id,
        version,
        checksum,
        createdAt: existingSave?.createdAt || now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Load game state
savesRouter.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const save = await db.query.saves.findFirst({
      where: eq(schema.saves.userId, req.user.id),
      orderBy: [desc(schema.saves.updatedAt)],
    });

    if (!save) {
      return res.json({
        success: true,
        save: null,
      });
    }

    res.json({
      success: true,
      save: {
        id: save.id,
        userId: save.userId,
        version: save.version,
        data: JSON.parse(save.data),
        checksum: save.checksum,
        createdAt: save.createdAt,
        updatedAt: save.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error loading game:', error);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

// Sync game state with offline progress
savesRouter.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { localSave, lastSyncedAt } = req.body as {
    localSave: {
      version: string;
      timestamp: number;
      data: SerializableGameState;
      checksum: string;
    };
    lastSyncedAt: number | null;
  };

  if (!localSave) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing localSave',
    });
  }

  try {
    // Get server save
    const serverSave = await db.query.saves.findFirst({
      where: eq(schema.saves.userId, req.user.id),
      orderBy: [desc(schema.saves.updatedAt)],
    });

    let offlineProgress = null;
    let finalData = localSave.data;
    let conflict = false;

    // If server has a save and it's newer, there's a conflict
    if (serverSave) {
      const serverTimestamp = serverSave.updatedAt.getTime();
      const localTimestamp = localSave.timestamp;

      if (serverTimestamp > localTimestamp) {
        // Server is newer - conflict
        conflict = true;
      }
    }

    // Calculate offline progress
    const lastPlayedAt = localSave.data.lastPlayedAt;
    const currentTime = Date.now();

    if (lastPlayedAt && currentTime - lastPlayedAt > 1000) {
      offlineProgress = calculateOfflineProgress(
        localSave.data,
        lastPlayedAt,
        currentTime
      );

      // Apply offline progress to local save data
      if (offlineProgress) {
        finalData = applyOfflineProgress(localSave.data, offlineProgress);
      }
    }

    // Save the synced state
    const saveId = serverSave?.id || crypto.randomUUID();
    const now = new Date();

    if (serverSave && !conflict) {
      await db.update(schema.saves)
        .set({
          version: localSave.version,
          data: JSON.stringify(finalData),
          checksum: localSave.checksum,
          updatedAt: now,
        })
        .where(eq(schema.saves.id, serverSave.id));
    } else if (!serverSave) {
      await db.insert(schema.saves).values({
        id: saveId,
        userId: req.user.id,
        version: localSave.version,
        data: JSON.stringify(finalData),
        checksum: localSave.checksum,
      });
    }

    res.json({
      success: true,
      save: {
        id: saveId,
        userId: req.user.id,
        version: localSave.version,
        data: finalData,
        checksum: localSave.checksum,
        createdAt: serverSave?.createdAt || now,
        updatedAt: now,
      },
      offlineProgress,
      conflict,
      serverSave: conflict && serverSave ? {
        id: serverSave.id,
        data: JSON.parse(serverSave.data),
        updatedAt: serverSave.updatedAt,
      } : undefined,
    });
  } catch (error) {
    console.error('Error syncing game:', error);
    res.status(500).json({ error: 'Failed to sync game' });
  }
});

// Helper to apply offline progress
function applyOfflineProgress(
  data: SerializableGameState,
  progress: ReturnType<typeof calculateOfflineProgress>
): SerializableGameState {
  if (!progress) return data;

  const updatedResources = { ...data.resources };

  for (const [resourceId, amount] of Object.entries(progress.resourcesGained)) {
    if (updatedResources[resourceId]) {
      updatedResources[resourceId] = {
        ...updatedResources[resourceId],
        current: updatedResources[resourceId].current + amount,
        lifetime: updatedResources[resourceId].lifetime + amount,
      };
    }
  }

  return {
    ...data,
    resources: updatedResources,
    lastPlayedAt: Date.now(),
  };
}
