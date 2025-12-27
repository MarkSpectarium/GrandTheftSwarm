import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus, SubscriptionManager } from "./EventBus";

describe("EventBus", () => {
  beforeEach(() => {
    // Clear all subscriptions between tests
    EventBus.clearAll();
  });

  describe("on/emit", () => {
    it("should call subscribed callback when event is emitted", () => {
      const callback = vi.fn();
      EventBus.on("game:tick", callback);

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ deltaMs: 100, totalMs: 1000 });
    });

    it("should call multiple subscribers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      EventBus.on("game:start", callback1);
      EventBus.on("game:start", callback2);

      EventBus.emit("game:start", undefined);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should not call callback for different event type", () => {
      const callback = vi.fn();
      EventBus.on("game:start", callback);

      EventBus.emit("game:pause", undefined);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should pass correct payload to callback", () => {
      const callback = vi.fn();
      EventBus.on("resource:changed", callback);

      EventBus.emit("resource:changed", {
        resourceId: "rice",
        oldValue: 100,
        newValue: 150,
      });

      expect(callback).toHaveBeenCalledWith({
        resourceId: "rice",
        oldValue: 100,
        newValue: 150,
      });
    });
  });

  describe("once", () => {
    it("should only call callback once", () => {
      const callback = vi.fn();
      EventBus.once("game:tick", callback);

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });
      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1100 });
      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1200 });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("unsubscribe", () => {
    it("should stop receiving events after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = EventBus.on("game:tick", callback);

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1100 });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not affect other subscribers when unsubscribing", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = EventBus.on("game:tick", callback1);
      EventBus.on("game:tick", callback2);

      unsub1();

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe("clear", () => {
    it("should remove all subscribers for a specific event", () => {
      const tickCallback = vi.fn();
      const startCallback = vi.fn();

      EventBus.on("game:tick", tickCallback);
      EventBus.on("game:start", startCallback);

      EventBus.clear("game:tick");

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });
      EventBus.emit("game:start", undefined);

      expect(tickCallback).not.toHaveBeenCalled();
      expect(startCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should continue to other subscribers if one throws", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Test error");
      });
      const goodCallback = vi.fn();

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      EventBus.on("game:tick", errorCallback);
      EventBus.on("game:tick", goodCallback);

      EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });

      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe("SubscriptionManager", () => {
  beforeEach(() => {
    EventBus.clearAll();
  });

  it("should track subscriptions", () => {
    const manager = new SubscriptionManager();
    expect(manager.count).toBe(0);

    manager.subscribe("game:tick", () => {});
    expect(manager.count).toBe(1);

    manager.subscribe("game:start", () => {});
    expect(manager.count).toBe(2);
  });

  it("should unsubscribe all on dispose", () => {
    const manager = new SubscriptionManager();
    const callback = vi.fn();

    manager.subscribe("game:tick", callback);
    manager.subscribe("game:tick", callback);

    EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1000 });
    expect(callback).toHaveBeenCalledTimes(2);

    manager.dispose();
    expect(manager.count).toBe(0);

    EventBus.emit("game:tick", { deltaMs: 100, totalMs: 1100 });
    expect(callback).toHaveBeenCalledTimes(2); // No new calls
  });

  it("should track unsubscribers added via add()", () => {
    const manager = new SubscriptionManager();
    const unsubscribeFn = vi.fn();

    manager.add(unsubscribeFn);
    expect(manager.count).toBe(1);

    manager.dispose();
    expect(unsubscribeFn).toHaveBeenCalledTimes(1);
  });
});
