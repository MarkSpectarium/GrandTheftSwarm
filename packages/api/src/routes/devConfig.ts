/**
 * Dev Config API Routes
 *
 * Provides endpoints for writing config changes directly to source files.
 * This is a development tool - should be disabled or protected in production.
 */

import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export const devConfigRouter: Router = Router();

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to client config directory (relative to API package)
const CLIENT_CONFIG_PATH = path.resolve(__dirname, '../../../client/src/config');

interface BuildingOverride {
  baseCostAmount?: number;
  baseCostMultiple?: Record<string, number>;
  productionAmount?: number;
  productionIntervalMs?: number;
  unlockDisabled?: boolean;
  maxOwned?: number | null;
  // Consumption overrides
  consumption?: {
    [resourceId: string]: {
      amountPerTick?: number;
      healthLossPerMissing?: number;
    };
  };
  consumptionMaxHealth?: number;
  // Effects overrides
  effects?: {
    [stackId: string]: {
      value?: number;
      valuePerUnit?: number;
    };
  };
  // Special effects
  specialEffects?: {
    synergyBonus?: number;
  };
}

interface UpgradeOverride {
  costAmount?: number;
  costMultiple?: Record<string, number>;
  effectValue?: number;
  effects?: Record<string, number>;
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
 * Find a building block in the content by ID
 * Returns the start and end indices of the building object
 */
function findBuildingBlock(content: string, buildingId: string): { start: number; end: number } | null {
  // Find the id line
  const idPattern = new RegExp(`id:\\s*["']${buildingId}["']`);
  const idMatch = content.match(idPattern);
  if (!idMatch || idMatch.index === undefined) return null;

  // Find the opening brace before this id
  let braceCount = 0;
  let start = idMatch.index;
  for (let i = idMatch.index; i >= 0; i--) {
    if (content[i] === '{') {
      braceCount++;
      if (braceCount === 1) {
        start = i;
        break;
      }
    } else if (content[i] === '}') {
      braceCount--;
    }
  }

  // Find the closing brace
  braceCount = 0;
  let end = start;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        end = i + 1;
        break;
      }
    }
  }

  return { start, end };
}

/**
 * Replace a numeric value in a block, handling nested structures
 */
function replaceValueInBlock(
  block: string,
  path: string[], // e.g., ['consumption', 'resources', '0', 'amountPerTick']
  newValue: number
): string {
  // Build a regex pattern for the path
  // This is a simplified approach - we search for the specific key and update its value
  const key = path[path.length - 1];

  // For deeply nested paths, we need to find the right context
  if (path.length === 1) {
    // Simple top-level key
    const regex = new RegExp(`(${key}:\\s*)(\\d+(?:\\.\\d+)?)`);
    return block.replace(regex, `$1${newValue}`);
  }

  // For nested paths like ['consumption', 'resources', '0', 'amountPerTick']
  // or ['specialEffects', '0', 'params', 'synergyBonus']
  // We need to find the parent context first

  // Special handling for consumption.resources[].amountPerTick
  if (path[0] === 'consumption' && path[1] === 'resources') {
    const resourceIndex = parseInt(path[2], 10);
    const field = path[3];

    // Find the consumption block
    const consumptionMatch = block.match(/consumption:\s*\{/);
    if (!consumptionMatch) return block;

    // Find the resources array
    const resourcesMatch = block.slice(consumptionMatch.index).match(/resources:\s*\[/);
    if (!resourcesMatch) return block;

    // Now find the Nth resource object and update the field
    let resourceCount = 0;
    let searchStart = consumptionMatch.index! + resourcesMatch.index! + resourcesMatch[0].length;
    let braceDepth = 0;
    let inResource = false;
    let resourceStart = searchStart;

    for (let i = searchStart; i < block.length && resourceCount <= resourceIndex; i++) {
      if (block[i] === '{') {
        if (!inResource) {
          inResource = true;
          resourceStart = i;
        }
        braceDepth++;
      } else if (block[i] === '}') {
        braceDepth--;
        if (braceDepth === 0 && inResource) {
          if (resourceCount === resourceIndex) {
            // Found our resource block, update the field
            const resourceBlock = block.slice(resourceStart, i + 1);
            const fieldRegex = new RegExp(`(${field}:\\s*)(\\d+(?:\\.\\d+)?)`);
            const updatedResource = resourceBlock.replace(fieldRegex, `$1${newValue}`);
            return block.slice(0, resourceStart) + updatedResource + block.slice(i + 1);
          }
          resourceCount++;
          inResource = false;
        }
      } else if (block[i] === ']' && braceDepth === 0) {
        break; // End of resources array
      }
    }
  }

  // Special handling for specialEffects[].params.synergyBonus
  if (path[0] === 'specialEffects' && path[2] === 'params') {
    const field = path[3];
    // Find synergyBonus in any specialEffect with type "synergy"
    const regex = new RegExp(`(synergyBonus:\\s*)(\\d+(?:\\.\\d+)?)`);
    return block.replace(regex, `$1${newValue}`);
  }

  // For consumption.maxHealth
  if (path[0] === 'consumption' && path[1] === 'maxHealth') {
    const regex = new RegExp(`(maxHealth:\\s*)(\\d+)`);
    return block.replace(regex, `$1${newValue}`);
  }

  return block;
}

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
    const blockPos = findBuildingBlock(content, buildingId);
    if (!blockPos) continue;

    let block = content.slice(blockPos.start, blockPos.end);
    const originalBlock = block;

    // Update baseCost amount
    if (override.baseCostAmount !== undefined) {
      const regex = /(baseCost:\s*\[\s*\{[^}]*amount:\s*)(\d+(?:\.\d+)?)/;
      block = block.replace(regex, `$1${override.baseCostAmount}`);
    }

    // Update baseCost for multiple resources
    if (override.baseCostMultiple) {
      for (const [resourceId, amount] of Object.entries(override.baseCostMultiple)) {
        const regex = new RegExp(`(resourceId:\\s*["']${resourceId}["'][^}]*amount:\\s*)(\\d+(?:\\.\\d+)?)`);
        block = block.replace(regex, `$1${amount}`);
      }
    }

    // Update maxOwned
    if (override.maxOwned !== undefined) {
      if (override.maxOwned === null) {
        block = block.replace(/\s*maxOwned:\s*\d+,?\s*/g, '');
      } else {
        const regex = /(maxOwned:\s*)(\d+)/;
        block = block.replace(regex, `$1${override.maxOwned}`);
      }
    }

    // Update consumption
    if (override.consumption) {
      for (const [resourceId, consumptionData] of Object.entries(override.consumption)) {
        // Find the resource in consumption.resources array by resourceId
        if (consumptionData.amountPerTick !== undefined) {
          // Find the consumption resource block for this resourceId
          const resourcePattern = new RegExp(
            `(resourceId:\\s*["']${resourceId}["'][^}]*amountPerTick:\\s*)(\\d+(?:\\.\\d+)?)`,
            's'
          );
          block = block.replace(resourcePattern, `$1${consumptionData.amountPerTick}`);
        }
        if (consumptionData.healthLossPerMissing !== undefined) {
          const resourcePattern = new RegExp(
            `(resourceId:\\s*["']${resourceId}["'][^}]*healthLossPerMissing:\\s*)(\\d+(?:\\.\\d+)?)`,
            's'
          );
          block = block.replace(resourcePattern, `$1${consumptionData.healthLossPerMissing}`);
        }
      }
    }

    // Update consumption maxHealth
    if (override.consumptionMaxHealth !== undefined) {
      const regex = /(consumption:\s*\{[^}]*maxHealth:\s*)(\d+)/s;
      block = block.replace(regex, `$1${override.consumptionMaxHealth}`);
    }

    // Update specialEffects synergyBonus
    if (override.specialEffects?.synergyBonus !== undefined) {
      const regex = /(synergyBonus:\s*)([\d.]+)/;
      block = block.replace(regex, `$1${override.specialEffects.synergyBonus}`);
    }

    // Count changes
    if (block !== originalBlock) {
      changesApplied++;
      content = content.slice(0, blockPos.start) + block + content.slice(blockPos.end);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Applied ${changesApplied} building changes to buildings.config.ts`,
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
