/**
 * Dev Config API Routes
 *
 * Provides endpoints for writing config changes directly to source files.
 * This is a development tool - should be disabled or protected in production.
 */

import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export const devConfigRouter: Router = Router();

// Path to client config directory (relative to API package)
const CLIENT_CONFIG_PATH = path.resolve(__dirname, '../../../client/src/config');

interface BuildingOverride {
  baseCostAmount?: number;
  baseCostMultiple?: Record<string, number>;
  productionAmount?: number;
  productionIntervalMs?: number;
  unlockDisabled?: boolean;
  maxOwned?: number | null;
}

interface UpgradeOverride {
  costAmount?: number;
  costMultiple?: Record<string, number>;
  effectValue?: number;
  unlockDisabled?: boolean;
}

interface TimingOverride {
  baseTickMs?: number;
  idleTickMs?: number;
  maxOfflineSeconds?: number;
  offlineEfficiency?: number;
  autoSaveIntervalMs?: number;
}

interface GameplayOverride {
  clickBaseAmount?: number;
}

interface ConfigOverrides {
  version: string;
  timestamp: number;
  buildings: Record<string, Partial<BuildingOverride>>;
  upgrades: Record<string, Partial<UpgradeOverride>>;
  timing: Partial<TimingOverride>;
  gameplay: Partial<GameplayOverride>;
}

/**
 * POST /api/dev/config
 * Writes config overrides to source files
 */
devConfigRouter.post('/', async (req: Request, res: Response) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_CONFIG) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Config editing is disabled in production',
    });
  }

  const overrides = req.body as ConfigOverrides;

  if (!overrides || typeof overrides !== 'object') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid config overrides format',
    });
  }

  try {
    const results: Record<string, { success: boolean; message: string }> = {};

    // Write building overrides
    if (overrides.buildings && Object.keys(overrides.buildings).length > 0) {
      const buildingResult = await writeBuildingOverrides(overrides.buildings);
      results.buildings = buildingResult;
    }

    // Write upgrade overrides
    if (overrides.upgrades && Object.keys(overrides.upgrades).length > 0) {
      const upgradeResult = await writeUpgradeOverrides(overrides.upgrades);
      results.upgrades = upgradeResult;
    }

    // Write timing overrides
    if (overrides.timing && Object.keys(overrides.timing).length > 0) {
      const timingResult = await writeTimingOverrides(overrides.timing);
      results.timing = timingResult;
    }

    // Write gameplay overrides (to index.ts)
    if (overrides.gameplay && Object.keys(overrides.gameplay).length > 0) {
      const gameplayResult = await writeGameplayOverrides(overrides.gameplay);
      results.gameplay = gameplayResult;
    }

    res.json({
      success: true,
      message: 'Config files updated successfully',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error writing config:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to write config',
    });
  }
});

/**
 * GET /api/dev/config/status
 * Check if dev config API is enabled
 */
devConfigRouter.get('/status', (_req: Request, res: Response) => {
  const isEnabled = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_CONFIG === 'true';

  res.json({
    enabled: isEnabled,
    configPath: CLIENT_CONFIG_PATH,
    exists: fs.existsSync(CLIENT_CONFIG_PATH),
  });
});

/**
 * Write building overrides to buildings.config.ts
 */
async function writeBuildingOverrides(
  overrides: Record<string, Partial<BuildingOverride>>
): Promise<{ success: boolean; message: string }> {
  const filePath = path.join(CLIENT_CONFIG_PATH, 'content/buildings.config.ts');

  if (!fs.existsSync(filePath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changesApplied = 0;

  for (const [buildingId, override] of Object.entries(overrides)) {
    // Find the building definition block
    const buildingRegex = new RegExp(
      `(\\{[^}]*id:\\s*["']${buildingId}["'][^}]*\\})`,
      'gs'
    );

    content = content.replace(buildingRegex, (match) => {
      let updated = match;

      // Update baseCost amount for single-resource buildings
      if (override.baseCostAmount !== undefined) {
        updated = updated.replace(
          /(baseCost:\s*\[\s*\{[^}]*amount:\s*)(\d+(?:\.\d+)?)/,
          `$1${override.baseCostAmount}`
        );
        changesApplied++;
      }

      // Update production outputs baseAmount
      if (override.productionAmount !== undefined) {
        // This is trickier because production comes from shared
        // We'll add a comment noting the override for now
        // The actual override happens via the runtime system
      }

      // Update maxOwned
      if (override.maxOwned !== undefined) {
        if (override.maxOwned === null) {
          // Remove maxOwned line
          updated = updated.replace(/\s*maxOwned:\s*\d+,?\s*/g, '');
        } else if (updated.includes('maxOwned:')) {
          updated = updated.replace(
            /(maxOwned:\s*)(\d+)/,
            `$1${override.maxOwned}`
          );
        }
        changesApplied++;
      }

      return updated;
    });
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Applied ${changesApplied} changes to buildings.config.ts`,
  };
}

/**
 * Write upgrade overrides to upgrades.config.ts
 */
async function writeUpgradeOverrides(
  overrides: Record<string, Partial<UpgradeOverride>>
): Promise<{ success: boolean; message: string }> {
  const filePath = path.join(CLIENT_CONFIG_PATH, 'content/upgrades.config.ts');

  if (!fs.existsSync(filePath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changesApplied = 0;

  for (const [upgradeId, override] of Object.entries(overrides)) {
    // Find the upgrade definition block - need to capture multi-line blocks
    // Match from id to the closing of effects array or resetsOnPrestige
    const startPattern = `id:\\s*["']${upgradeId}["']`;
    const startMatch = content.match(new RegExp(startPattern));

    if (!startMatch || startMatch.index === undefined) continue;

    // Find the start of this upgrade object (find opening brace before id)
    let braceCount = 0;
    let blockStart = startMatch.index;
    for (let i = startMatch.index; i >= 0; i--) {
      if (content[i] === '{') {
        braceCount++;
        if (braceCount === 1) {
          blockStart = i;
          break;
        }
      } else if (content[i] === '}') {
        braceCount--;
      }
    }

    // Find the end of this upgrade object
    braceCount = 0;
    let blockEnd = blockStart;
    for (let i = blockStart; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          blockEnd = i + 1;
          break;
        }
      }
    }

    let block = content.substring(blockStart, blockEnd);

    // Update cost amount for single-resource upgrades
    if (override.costAmount !== undefined) {
      block = block.replace(
        /(cost:\s*\[\s*\{[^}]*amount:\s*)(\d+(?:\.\d+)?)/,
        `$1${override.costAmount}`
      );
      changesApplied++;
    }

    // Update effect value
    if (override.effectValue !== undefined) {
      block = block.replace(
        /(effects:\s*\[\s*\{[^}]*value:\s*)(\d+(?:\.\d+)?)/,
        `$1${override.effectValue}`
      );
      changesApplied++;
    }

    content = content.substring(0, blockStart) + block + content.substring(blockEnd);
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Applied ${changesApplied} changes to upgrades.config.ts`,
  };
}

/**
 * Write timing overrides to timing.config.ts
 */
async function writeTimingOverrides(
  override: Partial<TimingOverride>
): Promise<{ success: boolean; message: string }> {
  const filePath = path.join(CLIENT_CONFIG_PATH, 'balance/timing.config.ts');

  if (!fs.existsSync(filePath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changesApplied = 0;

  const timingFields: Array<keyof TimingOverride> = [
    'baseTickMs',
    'idleTickMs',
    'maxOfflineSeconds',
    'offlineEfficiency',
    'autoSaveIntervalMs',
  ];

  for (const field of timingFields) {
    if (override[field] !== undefined) {
      const regex = new RegExp(`(${field}:\\s*)(\\d+(?:\\.\\d+)?)`);
      if (regex.test(content)) {
        content = content.replace(regex, `$1${override[field]}`);
        changesApplied++;
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Applied ${changesApplied} changes to timing.config.ts`,
  };
}

/**
 * Write gameplay overrides to index.ts
 */
async function writeGameplayOverrides(
  override: Partial<GameplayOverride>
): Promise<{ success: boolean; message: string }> {
  const filePath = path.join(CLIENT_CONFIG_PATH, 'index.ts');

  if (!fs.existsSync(filePath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let changesApplied = 0;

  if (override.clickBaseAmount !== undefined) {
    const regex = /(clickBaseAmount:\s*)(\d+(?:\.\d+)?)/;
    if (regex.test(content)) {
      content = content.replace(regex, `$1${override.clickBaseAmount}`);
      changesApplied++;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Applied ${changesApplied} changes to index.ts`,
  };
}
