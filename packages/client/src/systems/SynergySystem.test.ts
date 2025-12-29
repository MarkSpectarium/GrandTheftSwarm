import { describe, it, expect, beforeEach, vi } from "vitest";
import { SynergySystem } from "./SynergySystem";
import { MultiplierSystem } from "../core/MultiplierSystem";
import { EventBus } from "../core/EventBus";
import type { GameConfig, BuildingConfig, MultiplierStackConfig } from "../config/types";

// Mock StateManager
const createMockStateManager = () => {
  const buildingStates: Record<string, { owned: number; unlocked: boolean }> = {};

  return {
    getBuilding: vi.fn((id: string) => buildingStates[id] ?? { owned: 0, unlocked: false }),
    setBuildingOwned: (id: string, count: number) => {
      buildingStates[id] = { owned: count, unlocked: true };
    },
    resetBuildings: () => {
      Object.keys(buildingStates).forEach((key) => delete buildingStates[key]);
    },
  };
};

// Create test config with synergy
const createTestConfig = (): GameConfig => {
  const buildings: BuildingConfig[] = [
    {
      id: "paddy_field",
      name: "Paddy Field",
      namePlural: "Paddy Fields",
      description: "Test paddy field",
      category: "production",
      unlockedAtEra: 1,
      visibleBeforeUnlock: true,
      icon: "paddy",
      visualTier: 1,
      baseCost: [{ resourceId: "rice", amount: 50 }],
      costCurve: "cost_standard",
      allowBulkPurchase: true,
      production: {
        outputs: [{ resourceId: "rice", baseAmount: 1 }],
        baseIntervalMs: 1000,
        requiresActive: false,
        idleEfficiency: 1,
        amountStackId: "paddy_production",
      },
      resetsOnPrestige: true,
    },
    {
      id: "buffalo",
      name: "Water Buffalo",
      namePlural: "Water Buffalo",
      description: "Test buffalo",
      category: "automation",
      unlockedAtEra: 1,
      visibleBeforeUnlock: true,
      icon: "buffalo",
      visualTier: 1,
      baseCost: [{ resourceId: "rice", amount: 1000 }],
      costCurve: "cost_standard",
      allowBulkPurchase: true,
      production: {
        outputs: [{ resourceId: "rice", baseAmount: 5 }],
        baseIntervalMs: 1000,
        requiresActive: false,
        idleEfficiency: 1,
        amountStackId: "buffalo_production",
      },
      specialEffects: [
        {
          type: "synergy",
          params: {
            synergyBuilding: "paddy_field",
            synergyBonus: 0.1,
          },
          description: "Each buffalo increases paddy field production by 10%",
        },
      ],
      resetsOnPrestige: true,
    },
    {
      id: "drone",
      name: "Harvest Drone",
      namePlural: "Harvest Drones",
      description: "Test drone with multiple synergies",
      category: "automation",
      unlockedAtEra: 1,
      visibleBeforeUnlock: true,
      icon: "drone",
      visualTier: 1,
      baseCost: [{ resourceId: "rice", amount: 10000 }],
      costCurve: "cost_standard",
      allowBulkPurchase: true,
      production: {
        outputs: [{ resourceId: "rice", baseAmount: 10 }],
        baseIntervalMs: 1000,
        requiresActive: false,
        idleEfficiency: 1,
        amountStackId: "drone_production",
      },
      specialEffects: [
        {
          type: "synergy",
          params: {
            synergyBuilding: "paddy_field",
            synergyBonus: 0.05, // +5% per drone
          },
          description: "Each drone increases paddy field production by 5%",
        },
      ],
      resetsOnPrestige: true,
    },
    {
      id: "family_worker",
      name: "Family Member",
      namePlural: "Family Members",
      description: "Test worker with building effects",
      category: "automation",
      unlockedAtEra: 1,
      visibleBeforeUnlock: true,
      icon: "worker",
      visualTier: 1,
      baseCost: [{ resourceId: "rice", amount: 200 }],
      costCurve: "cost_standard",
      allowBulkPurchase: true,
      production: {
        outputs: [{ resourceId: "rice", baseAmount: 2 }],
        baseIntervalMs: 1000,
        requiresActive: false,
        idleEfficiency: 1,
        amountStackId: "worker_production",
      },
      effects: [
        {
          stackId: "click_power",
          value: 0.1, // +10% click power per worker
          scalesWithVar: "owned",
          valuePerUnit: 0.1,
        },
      ],
      resetsOnPrestige: true,
    },
    {
      id: "sampan",
      name: "Sampan",
      namePlural: "Sampans",
      description: "Test boat with fixed effect",
      category: "transport",
      unlockedAtEra: 1,
      visibleBeforeUnlock: true,
      icon: "sampan",
      visualTier: 1,
      baseCost: [{ resourceId: "rice", amount: 500 }],
      costCurve: "cost_standard",
      allowBulkPurchase: true,
      production: {
        outputs: [],
        baseIntervalMs: 1000,
        requiresActive: false,
        idleEfficiency: 1,
      },
      effects: [
        {
          stackId: "trade_capacity",
          value: 100, // Each sampan adds 100 cargo capacity (fixed, not scaling)
        },
      ],
      resetsOnPrestige: true,
    },
  ];

  const multiplierStacks: MultiplierStackConfig[] = [
    {
      id: "paddy_production",
      name: "Paddy Field Production",
      category: "specific_resource",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "buffalo_production",
      name: "Buffalo Production",
      category: "specific_resource",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "drone_production",
      name: "Drone Production",
      category: "specific_resource",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "worker_production",
      name: "Worker Production",
      category: "specific_resource",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "click_power",
      name: "Click Power",
      category: "click_power",
      stackType: "multiplicative",
      baseValue: 1,
    },
    {
      id: "trade_capacity",
      name: "Trade Capacity",
      category: "specific_resource",
      stackType: "multiplicative",
      baseValue: 1,
    },
  ];

  return {
    meta: { name: "Test Game", version: "1.0.0", description: "Test" },
    gameplay: { clickHarvestResource: "rice", clickBaseAmount: 1, marketCurrency: "dong" },
    timing: {
      baseTickMs: 100,
      maxDeltaMs: 1000,
      offlineProductionRate: 0.5,
      autoSaveIntervalMs: 60000,
      maxOfflineTimeMs: 86400000,
      minimumFrameMs: 16,
    },
    formatting: {
      numberFormat: "suffix",
      decimalPlaces: 2,
      suffixes: ["", "K", "M", "B", "T"],
    },
    curves: {},
    multiplierStacks,
    resources: [],
    conversions: [],
    marketPrices: [],
    buildings,
    buildingTiers: [],
    upgrades: [],
    upgradePaths: [],
    repeatableUpgrades: [],
    events: [],
    seasonalEvents: [],
    eventPools: [],
    eras: [],
    eraTransitions: [],
  } as unknown as GameConfig;
};

describe("SynergySystem", () => {
  let synergySystem: SynergySystem;
  let multiplierSystem: MultiplierSystem;
  let mockStateManager: ReturnType<typeof createMockStateManager>;
  let config: GameConfig;

  beforeEach(() => {
    EventBus.clearAll();
    config = createTestConfig();
    multiplierSystem = new MultiplierSystem(config.multiplierStacks);
    mockStateManager = createMockStateManager();
    synergySystem = new SynergySystem(
      config,
      mockStateManager as unknown as ConstructorParameters<typeof SynergySystem>[1],
      multiplierSystem
    );
  });

  describe("initialization", () => {
    it("should extract synergy definitions from config", () => {
      // The system should have found 2 synergies (buffalo -> paddy, drone -> paddy)
      const bonuses = synergySystem.getSynergyBonuses();
      // With 0 buildings owned, no bonuses should be active
      expect(bonuses).toHaveLength(0);
    });

    it("should apply existing synergies on initialization", () => {
      // Set up state before creating system
      mockStateManager.setBuildingOwned("buffalo", 5);

      // Create new system with pre-existing building state
      const newSystem = new SynergySystem(
        config,
        mockStateManager as unknown as ConstructorParameters<typeof SynergySystem>[1],
        multiplierSystem
      );

      // Should have applied the synergy: 1 + (5 * 0.1) = 1.5
      expect(multiplierSystem.getValue("paddy_production")).toBe(1.5);

      newSystem.dispose();
    });
  });

  describe("synergy application", () => {
    it("should apply synergy bonus when building is purchased", () => {
      // Initially no bonus
      expect(multiplierSystem.getValue("paddy_production")).toBe(1);

      // Simulate purchasing 5 buffalo
      mockStateManager.setBuildingOwned("buffalo", 5);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 5,
        totalOwned: 5,
      });

      // Should have applied: 1 + (5 * 0.1) = 1.5
      expect(multiplierSystem.getValue("paddy_production")).toBe(1.5);
    });

    it("should update synergy bonus when more buildings are purchased", () => {
      // Purchase 3 buffalo
      mockStateManager.setBuildingOwned("buffalo", 3);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 3,
        totalOwned: 3,
      });

      // 1 + (3 * 0.1) = 1.3
      expect(multiplierSystem.getValue("paddy_production")).toBe(1.3);

      // Purchase 2 more buffalo (total 5)
      mockStateManager.setBuildingOwned("buffalo", 5);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 2,
        totalOwned: 5,
      });

      // 1 + (5 * 0.1) = 1.5
      expect(multiplierSystem.getValue("paddy_production")).toBe(1.5);
    });

    it("should remove synergy bonus when all source buildings are removed", () => {
      // Purchase 3 buffalo
      mockStateManager.setBuildingOwned("buffalo", 3);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 3,
        totalOwned: 3,
      });

      expect(multiplierSystem.getValue("paddy_production")).toBe(1.3);

      // All buffalo die
      mockStateManager.setBuildingOwned("buffalo", 0);
      EventBus.emit("building:removed", {
        buildingId: "buffalo",
        count: 3,
        remaining: 0,
      });

      // Back to base value
      expect(multiplierSystem.getValue("paddy_production")).toBe(1);
    });

    it("should stack synergies from multiple sources", () => {
      // Purchase 5 buffalo (5 * 0.1 = 0.5 bonus)
      mockStateManager.setBuildingOwned("buffalo", 5);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 5,
        totalOwned: 5,
      });

      // Purchase 4 drones (4 * 0.05 = 0.2 bonus)
      mockStateManager.setBuildingOwned("drone", 4);
      EventBus.emit("building:purchased", {
        buildingId: "drone",
        count: 4,
        totalOwned: 4,
      });

      // Multiplicative stacking: 1.5 * 1.2 = 1.8
      expect(multiplierSystem.getValue("paddy_production")).toBeCloseTo(1.8);
    });
  });

  describe("getSynergyBonuses", () => {
    it("should return empty array when no buildings owned", () => {
      const bonuses = synergySystem.getSynergyBonuses();
      expect(bonuses).toHaveLength(0);
    });

    it("should return active synergy bonuses", () => {
      mockStateManager.setBuildingOwned("buffalo", 5);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 5,
        totalOwned: 5,
      });

      const bonuses = synergySystem.getSynergyBonuses();
      expect(bonuses).toHaveLength(1);
      expect(bonuses[0].sourceBuildingId).toBe("buffalo");
      expect(bonuses[0].targetBuildingId).toBe("paddy_field");
      expect(bonuses[0].sourceCount).toBe(5);
      expect(bonuses[0].totalBonus).toBe(0.5);
      expect(bonuses[0].description).toBe("Water Buffalo provides +50% production");
    });

    it("should return multiple bonuses when multiple synergies active", () => {
      mockStateManager.setBuildingOwned("buffalo", 3);
      mockStateManager.setBuildingOwned("drone", 2);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 3,
        totalOwned: 3,
      });
      EventBus.emit("building:purchased", {
        buildingId: "drone",
        count: 2,
        totalOwned: 2,
      });

      const bonuses = synergySystem.getSynergyBonuses();
      expect(bonuses).toHaveLength(2);
    });
  });

  describe("dispose", () => {
    it("should unsubscribe from events when disposed", () => {
      synergySystem.dispose();

      // Purchase buffalo after dispose - should not affect multiplier
      mockStateManager.setBuildingOwned("buffalo", 10);
      EventBus.emit("building:purchased", {
        buildingId: "buffalo",
        count: 10,
        totalOwned: 10,
      });

      // Should still be at base value since system was disposed
      expect(multiplierSystem.getValue("paddy_production")).toBe(1);
    });
  });

  describe("building effects", () => {
    it("should apply scaling building effects when building is purchased", () => {
      // Initially no bonus
      expect(multiplierSystem.getValue("click_power")).toBe(1);

      // Purchase 5 workers (scales with owned: 5 * 0.1 = 0.5 bonus)
      mockStateManager.setBuildingOwned("family_worker", 5);
      EventBus.emit("building:purchased", {
        buildingId: "family_worker",
        count: 5,
        totalOwned: 5,
      });

      // Should have applied: 1 + (5 * 0.1) = 1.5
      expect(multiplierSystem.getValue("click_power")).toBe(1.5);
    });

    it("should update building effects when more buildings are purchased", () => {
      // Purchase 3 workers
      mockStateManager.setBuildingOwned("family_worker", 3);
      EventBus.emit("building:purchased", {
        buildingId: "family_worker",
        count: 3,
        totalOwned: 3,
      });

      // 1 + (3 * 0.1) = 1.3
      expect(multiplierSystem.getValue("click_power")).toBe(1.3);

      // Purchase 2 more workers (total 5)
      mockStateManager.setBuildingOwned("family_worker", 5);
      EventBus.emit("building:purchased", {
        buildingId: "family_worker",
        count: 2,
        totalOwned: 5,
      });

      // 1 + (5 * 0.1) = 1.5
      expect(multiplierSystem.getValue("click_power")).toBe(1.5);
    });

    it("should remove building effects when all buildings are removed", () => {
      // Purchase 3 workers
      mockStateManager.setBuildingOwned("family_worker", 3);
      EventBus.emit("building:purchased", {
        buildingId: "family_worker",
        count: 3,
        totalOwned: 3,
      });

      expect(multiplierSystem.getValue("click_power")).toBe(1.3);

      // All workers removed
      mockStateManager.setBuildingOwned("family_worker", 0);
      EventBus.emit("building:removed", {
        buildingId: "family_worker",
        count: 3,
        remaining: 0,
      });

      // Back to base value
      expect(multiplierSystem.getValue("click_power")).toBe(1);
    });

    it("should apply fixed (non-scaling) building effects", () => {
      // Initially no bonus
      expect(multiplierSystem.getValue("trade_capacity")).toBe(1);

      // Purchase 3 sampans (fixed value: 100, doesn't scale)
      mockStateManager.setBuildingOwned("sampan", 3);
      EventBus.emit("building:purchased", {
        buildingId: "sampan",
        count: 3,
        totalOwned: 3,
      });

      // Fixed effect: 1 + 100 = 101 (value doesn't scale with count)
      expect(multiplierSystem.getValue("trade_capacity")).toBe(101);
    });

    it("should apply existing building effects on initialization", () => {
      // Set up state before creating system
      mockStateManager.setBuildingOwned("family_worker", 4);

      // Create new system with pre-existing building state
      const newSystem = new SynergySystem(
        config,
        mockStateManager as unknown as ConstructorParameters<typeof SynergySystem>[1],
        multiplierSystem
      );

      // Should have applied the effect: 1 + (4 * 0.1) = 1.4
      expect(multiplierSystem.getValue("click_power")).toBe(1.4);

      newSystem.dispose();
    });
  });

  describe("getBuildingEffectBonuses", () => {
    it("should return empty array when no buildings owned", () => {
      const bonuses = synergySystem.getBuildingEffectBonuses();
      expect(bonuses).toHaveLength(0);
    });

    it("should return active building effect bonuses", () => {
      mockStateManager.setBuildingOwned("family_worker", 5);
      EventBus.emit("building:purchased", {
        buildingId: "family_worker",
        count: 5,
        totalOwned: 5,
      });

      const bonuses = synergySystem.getBuildingEffectBonuses();
      expect(bonuses).toHaveLength(1);
      expect(bonuses[0].buildingId).toBe("family_worker");
      expect(bonuses[0].stackId).toBe("click_power");
      expect(bonuses[0].ownedCount).toBe(5);
      expect(bonuses[0].totalBonus).toBe(0.5);
      expect(bonuses[0].description).toBe("Family Member provides +50% click power");
    });
  });
});
