import { describe, it, expect, beforeEach } from "vitest";
import { MultiplierSystem } from "./MultiplierSystem";
import { EventBus } from "./EventBus";
import type { MultiplierStackConfig, MultiplierSourceConfig } from "../config/types";

// Using 'as const' to allow the test categories while maintaining type safety
const baseStacks = [
  {
    id: "click_power",
    name: "Click Power",
    category: "click_power" as const,
    stackType: "multiplicative" as const,
    baseValue: 1,
  },
  {
    id: "all_production",
    name: "All Production",
    category: "all_production" as const,
    stackType: "multiplicative" as const,
    baseValue: 1,
  },
  {
    id: "additive_test",
    name: "Additive Test",
    category: "click_power" as const, // Use valid category for tests
    stackType: "additive" as const,
    baseValue: 0,
  },
  {
    id: "capped_stack",
    name: "Capped Stack",
    category: "click_power" as const, // Use valid category for tests
    stackType: "multiplicative" as const,
    baseValue: 1,
    minValue: 0.5,
    maxValue: 5,
  },
] satisfies MultiplierStackConfig[];

// Helper to create a multiplier source config
function createSource(
  id: string,
  stackId: string,
  value: number,
  options: Partial<MultiplierSourceConfig> = {}
): MultiplierSourceConfig {
  return {
    id,
    stackId,
    value,
    sourceType: options.sourceType ?? "upgrade",
    sourceId: options.sourceId ?? id,
    sourceName: options.sourceName ?? `Source ${id}`,
    ...options,
  };
}

describe("MultiplierSystem", () => {
  let system: MultiplierSystem;

  beforeEach(() => {
    EventBus.clearAll();
    system = new MultiplierSystem(baseStacks);
  });

  describe("initialization", () => {
    it("should initialize with base values", () => {
      expect(system.getValue("click_power")).toBe(1);
      expect(system.getValue("all_production")).toBe(1);
      expect(system.getValue("additive_test")).toBe(0);
    });

    it("should return base value (1) for unknown stack", () => {
      expect(system.getValue("nonexistent")).toBe(1);
    });
  });

  describe("multiplicative stacks", () => {
    it("should multiply values together", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 2));

      expect(system.getValue("click_power")).toBe(2);

      system.addMultiplier(createSource("upgrade_2", "click_power", 3));

      // 1 (base) * 2 * 3 = 6
      expect(system.getValue("click_power")).toBe(6);
    });

    it("should handle decimal multipliers", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 1.5));
      system.addMultiplier(createSource("upgrade_2", "click_power", 2));

      // 1 * 1.5 * 2 = 3
      expect(system.getValue("click_power")).toBe(3);
    });
  });

  describe("additive stacks", () => {
    it("should add values together", () => {
      system.addMultiplier(createSource("bonus_1", "additive_test", 10));

      expect(system.getValue("additive_test")).toBe(10);

      system.addMultiplier(createSource("bonus_2", "additive_test", 5));

      // 0 (base) + 10 + 5 = 15
      expect(system.getValue("additive_test")).toBe(15);
    });
  });

  describe("removeMultiplier", () => {
    it("should remove multiplier by sourceId", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 2));
      system.addMultiplier(createSource("upgrade_2", "click_power", 3));

      expect(system.getValue("click_power")).toBe(6);

      system.removeMultiplier("click_power", "upgrade_1");

      // 1 * 3 = 3
      expect(system.getValue("click_power")).toBe(3);
    });

    it("should do nothing for nonexistent sourceId", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 2));

      system.removeMultiplier("click_power", "nonexistent");

      expect(system.getValue("click_power")).toBe(2);
    });
  });

  describe("value capping", () => {
    it("should respect minValue", () => {
      system.addMultiplier(createSource("reduction_1", "capped_stack", 0.1));

      // Would result in 0.1, but min is 0.5
      expect(system.getValue("capped_stack")).toBe(0.5);
    });

    it("should respect maxValue", () => {
      system.addMultiplier(createSource("boost_1", "capped_stack", 10));

      // Would result in 10, but max is 5
      expect(system.getValue("capped_stack")).toBe(5);
    });

    it("should allow values within range", () => {
      system.addMultiplier(createSource("boost_1", "capped_stack", 3));

      expect(system.getValue("capped_stack")).toBe(3);
    });
  });

  describe("temporary multipliers", () => {
    it("should add temporary multiplier with duration", () => {
      system.addMultiplier(
        createSource("temp_boost", "click_power", 2, {
          temporary: true,
          durationMs: 5000, // 5 seconds
        })
      );

      expect(system.getValue("click_power")).toBe(2);
    });

    it("should remove expired multipliers", () => {
      // Add a multiplier that already expired
      const now = Date.now();
      system.addMultiplier({
        id: "temp_boost",
        stackId: "click_power",
        value: 2,
        sourceType: "event",
        sourceId: "temp_boost",
        sourceName: "Temp Boost",
        temporary: true,
        durationMs: -1000, // Already expired (negative duration)
      });

      // The expired multiplier should be filtered out during recalculation
      // Note: The expiration happens at recalculation time based on expiresAt
      // Since we set negative duration, expiresAt = Date.now() - 1000
      // Calling processExpiredMultipliers should remove it
      system.processExpiredMultipliers(now + 1000);

      expect(system.getValue("click_power")).toBe(1);
    });
  });

  describe("getStackBreakdown", () => {
    it("should return stack breakdown", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 2));

      const breakdown = system.getStackBreakdown("click_power");

      expect(breakdown).toBeDefined();
      expect(breakdown.base).toBe(1);
      expect(breakdown.sources).toHaveLength(1);
      expect(breakdown.sources[0].name).toBe("Source upgrade_1");
      expect(breakdown.sources[0].value).toBe(2);
    });

    it("should return empty sources for unknown stack", () => {
      const breakdown = system.getStackBreakdown("nonexistent");
      expect(breakdown.base).toBe(1);
      expect(breakdown.sources).toHaveLength(0);
    });
  });

  describe("getStackSources", () => {
    it("should return all sources for a stack", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 2));
      system.addMultiplier(createSource("upgrade_2", "click_power", 3));

      const sources = system.getStackSources("click_power");

      expect(sources).toHaveLength(2);
    });

    it("should return empty array for unknown stack", () => {
      expect(system.getStackSources("nonexistent")).toHaveLength(0);
    });
  });

  describe("getAllStacks", () => {
    it("should return all stacks", () => {
      const stacks = system.getAllStacks();
      expect(stacks.size).toBe(4); // Our 4 test stacks
      expect(stacks.has("click_power")).toBe(true);
      expect(stacks.has("additive_test")).toBe(true);
    });
  });

  describe("events", () => {
    it("should emit multiplier:added when adding multiplier", () => {
      type AddedPayload = { stackId: string; sourceId: string; value: number };
      let eventPayload: AddedPayload | undefined;
      EventBus.on("multiplier:added", (payload) => {
        eventPayload = payload;
      });

      system.addMultiplier(createSource("upgrade_1", "click_power", 2));

      expect(eventPayload).toBeDefined();
      expect(eventPayload!.stackId).toBe("click_power");
      expect(eventPayload!.value).toBe(2);
    });

    it("should emit multiplier:changed when value changes", () => {
      type ChangedPayload = { stackId: string; oldValue: number; newValue: number };
      let eventPayload: ChangedPayload | undefined;
      EventBus.on("multiplier:changed", (payload) => {
        eventPayload = payload;
      });

      system.addMultiplier(createSource("upgrade_1", "click_power", 2));

      expect(eventPayload).toBeDefined();
      expect(eventPayload!.stackId).toBe("click_power");
      expect(eventPayload!.newValue).toBe(2);
    });

    it("should emit multiplier:removed when removing multiplier", () => {
      system.addMultiplier(createSource("upgrade_1", "click_power", 2));

      type RemovedPayload = { stackId: string; sourceId: string };
      let eventPayload: RemovedPayload | undefined;
      EventBus.on("multiplier:removed", (payload) => {
        eventPayload = payload;
      });

      system.removeMultiplier("click_power", "upgrade_1");

      expect(eventPayload).toBeDefined();
      expect(eventPayload!.stackId).toBe("click_power");
      expect(eventPayload!.sourceId).toBe("upgrade_1");
    });
  });
});
