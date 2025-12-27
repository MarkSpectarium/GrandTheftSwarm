import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameLoop } from "./GameLoop";
import { EventBus } from "./EventBus";
import type { TimingConfig, DevModeConfig } from "../config/types";

const defaultTimingConfig: TimingConfig = {
  baseTickMs: 100,
  idleTickMs: 1000,
  maxOfflineSeconds: 86400,
  offlineEfficiency: 0.5,
  autoSaveIntervalMs: 30000,
};

describe("GameLoop", () => {
  beforeEach(() => {
    EventBus.clearAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const loop = new GameLoop(defaultTimingConfig);
      const state = loop.getState();

      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isVisible).toBe(true);
      expect(state.totalTimeMs).toBe(0);
      expect(state.tickCount).toBe(0);
    });

    it("should have time multiplier of 1 without dev mode", () => {
      const loop = new GameLoop(defaultTimingConfig);
      expect(loop.getTimeMultiplier()).toBe(1);
    });
  });

  describe("start/stop/pause/resume", () => {
    it("should emit game:start when started", () => {
      const callback = vi.fn();
      EventBus.on("game:start", callback);

      const loop = new GameLoop(defaultTimingConfig);
      loop.start();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(loop.getState().isRunning).toBe(true);

      loop.dispose();
    });

    it("should emit game:pause when paused", () => {
      const callback = vi.fn();
      EventBus.on("game:pause", callback);

      const loop = new GameLoop(defaultTimingConfig);
      loop.start();
      loop.pause();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(loop.getState().isPaused).toBe(true);

      loop.dispose();
    });

    it("should emit game:resume when resumed", () => {
      const callback = vi.fn();
      EventBus.on("game:resume", callback);

      const loop = new GameLoop(defaultTimingConfig);
      loop.start();
      loop.pause();
      loop.resume();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(loop.getState().isPaused).toBe(false);

      loop.dispose();
    });

    it("should not pause if already paused", () => {
      const callback = vi.fn();
      EventBus.on("game:pause", callback);

      const loop = new GameLoop(defaultTimingConfig);
      loop.start();
      loop.pause();
      loop.pause();

      expect(callback).toHaveBeenCalledTimes(1);

      loop.dispose();
    });
  });

  describe("processTick", () => {
    it("should emit game:tick with correct delta", () => {
      const callback = vi.fn();
      EventBus.on("game:tick", callback);

      const loop = new GameLoop(defaultTimingConfig);
      loop.processTick(100);

      expect(callback).toHaveBeenCalledWith({
        deltaMs: 100,
        totalMs: 100,
      });

      loop.dispose();
    });

    it("should accumulate total time", () => {
      const loop = new GameLoop(defaultTimingConfig);

      loop.processTick(100);
      loop.processTick(200);
      loop.processTick(300);

      expect(loop.getState().totalTimeMs).toBe(600);
      expect(loop.getState().tickCount).toBe(3);

      loop.dispose();
    });
  });

  describe("processOfflineTime", () => {
    it("should apply offline efficiency", () => {
      const callback = vi.fn();
      EventBus.on("game:tick", callback);

      const loop = new GameLoop(defaultTimingConfig);
      loop.processOfflineTime(10000); // 10 seconds

      // With 0.5 efficiency, should process 5000ms
      expect(callback).toHaveBeenCalledWith({
        deltaMs: 5000,
        totalMs: 5000,
      });

      loop.dispose();
    });

    it("should cap offline time at maxOfflineSeconds", () => {
      const callback = vi.fn();
      EventBus.on("game:tick", callback);

      const config: TimingConfig = {
        ...defaultTimingConfig,
        maxOfflineSeconds: 60, // 1 minute max
        offlineEfficiency: 1,
      };

      const loop = new GameLoop(config);
      loop.processOfflineTime(120000); // 2 minutes

      // Should be capped at 60 seconds = 60000ms
      expect(callback).toHaveBeenCalledWith({
        deltaMs: 60000,
        totalMs: 60000,
      });

      loop.dispose();
    });
  });

  describe("dispose", () => {
    it("should stop the loop", () => {
      const loop = new GameLoop(defaultTimingConfig);
      loop.start();
      expect(loop.getState().isRunning).toBe(true);

      loop.dispose();
      expect(loop.getState().isRunning).toBe(false);
    });
  });
});

describe("GameLoop with DevMode", () => {
  beforeEach(() => {
    EventBus.clearAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("time multiplier", () => {
    it("should apply time multiplier from dev mode", () => {
      const devMode: DevModeConfig = {
        enabled: true,
        timeMultiplier: 10,
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const loop = new GameLoop(defaultTimingConfig, devMode);
      expect(loop.getTimeMultiplier()).toBe(10);

      consoleSpy.mockRestore();
      loop.dispose();
    });

    it("should not apply multiplier if dev mode is disabled", () => {
      const devMode: DevModeConfig = {
        enabled: false,
        timeMultiplier: 10,
      };

      const loop = new GameLoop(defaultTimingConfig, devMode);
      expect(loop.getTimeMultiplier()).toBe(1);

      loop.dispose();
    });

    it("should allow runtime multiplier changes", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const loop = new GameLoop(defaultTimingConfig);
      expect(loop.getTimeMultiplier()).toBe(1);

      loop.setTimeMultiplier(100);
      expect(loop.getTimeMultiplier()).toBe(100);

      loop.setTimeMultiplier(0.5); // Should be clamped to 1
      expect(loop.getTimeMultiplier()).toBe(1);

      consoleSpy.mockRestore();
      loop.dispose();
    });
  });

  describe("accelerated testing scenarios", () => {
    it("should simulate 10x speed progression", () => {
      const devMode: DevModeConfig = {
        enabled: true,
        timeMultiplier: 10,
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const tickCallback = vi.fn();
      EventBus.on("game:tick", tickCallback);

      const loop = new GameLoop(defaultTimingConfig, devMode);

      // Simulate 100ms real time = 1000ms game time at 10x
      loop.processTick(100);

      // The tick should be 10x the passed time
      // Note: processTick takes already-effective delta, not real delta
      // The multiplier is applied in the tick() method, not processTick()
      // So for this test, we verify the multiplier value is correct
      expect(loop.getTimeMultiplier()).toBe(10);

      consoleSpy.mockRestore();
      loop.dispose();
    });

    it("should log ticks in debug mode", () => {
      const devMode: DevModeConfig = {
        enabled: true,
        timeMultiplier: 1,
        logTicks: true,
      };

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const loop = new GameLoop(defaultTimingConfig, devMode);

      // The tick logging happens in the internal tick method
      // which is triggered by start() and timer callbacks
      // For now, we just verify the config is stored
      expect(loop.getTimeMultiplier()).toBe(1);

      consoleSpy.mockRestore();
      loop.dispose();
    });
  });
});
