/**
 * EventBus - Central event system for game communication
 *
 * Provides type-safe pub/sub messaging between game systems.
 * All game events flow through here for loose coupling.
 */

export type GameEventType =
  // Core game events
  | "game:tick"
  | "game:start"
  | "game:pause"
  | "game:resume"
  | "game:save"
  | "game:load"
  | "game:reset"

  // Resource events
  | "resource:changed"
  | "resource:gained"
  | "resource:spent"
  | "resource:maxed"

  // Building events
  | "building:purchased"
  | "building:production"
  | "building:unlocked"
  | "building:maxed"
  | "building:removed"
  | "building:health:changed"
  | "building:health:regen"
  | "building:died"
  | "building:disabled"

  // Consumption events
  | "consumption:shortage"
  | "consumption:processed"

  // Upgrade events
  | "upgrade:purchased"
  | "upgrade:unlocked"

  // Click events
  | "click:harvest"
  | "click:bonus"

  // Era events
  | "era:unlocked"
  | "era:transition:start"
  | "era:transition:complete"

  // Event system events
  | "event:triggered"
  | "event:expired"
  | "event:clicked"

  // Prestige events
  | "prestige:available"
  | "prestige:executed"

  // Multiplier events
  | "multiplier:added"
  | "multiplier:removed"
  | "multiplier:changed"

  // UI events
  | "ui:notification"
  | "ui:modal:open"
  | "ui:modal:close"
  | "ui:tab:changed"

  // Cloud sync events
  | "cloud:sync:start"
  | "cloud:sync:success"
  | "cloud:sync:error"
  | "cloud:sync:conflict"
  | "cloud:load:start"
  | "cloud:load:success"
  | "cloud:load:error"
  | "cloud:load:empty"
  | "cloud:offline:progress"
  | "cloud:conflict:error";

export interface GameEventPayload {
  "game:tick": { deltaMs: number; totalMs: number };
  "game:start": undefined;
  "game:pause": undefined;
  "game:resume": undefined;
  "game:save": { success: boolean };
  "game:load": { success: boolean };
  "game:reset": undefined;

  "resource:changed": { resourceId: string; oldValue: number; newValue: number };
  "resource:gained": { resourceId: string; amount: number; source: string };
  "resource:spent": { resourceId: string; amount: number; target: string };
  "resource:maxed": { resourceId: string };

  "building:purchased": { buildingId: string; count: number; totalOwned: number };
  "building:production": { buildingId: string; outputs: Record<string, number> };
  "building:unlocked": { buildingId: string };
  "building:maxed": { buildingId: string };
  "building:removed": { buildingId: string; count: number; remaining: number };
  "building:health:changed": { buildingId: string; oldHealth: number; newHealth: number; damage: number; maxHealth: number };
  "building:health:regen": { buildingId: string; oldHealth: number; newHealth: number; healed: number; maxHealth: number };
  "building:died": { buildingId: string; buildingName: string; remaining: number; cause: string };
  "building:disabled": { buildingId: string; reason: string };

  "consumption:shortage": { buildingId: string; resourceId: string; required: number; available: number; missing: number };
  "consumption:processed": { buildingId: string; resourceId: string; required: number; consumed: number; missing: number };

  "upgrade:purchased": { upgradeId: string };
  "upgrade:unlocked": { upgradeId: string };

  "click:harvest": { amount: number; multiplier: number };
  "click:bonus": { multiplier: number; source: string };

  "era:unlocked": { eraId: number };
  "era:transition:start": { fromEra: number; toEra: number };
  "era:transition:complete": { eraId: number };

  "event:triggered": { eventId: string; duration: number };
  "event:expired": { eventId: string };
  "event:clicked": { eventId: string; bonus: number };

  "prestige:available": { points: number };
  "prestige:executed": { pointsGained: number; totalPoints: number };

  "multiplier:added": { stackId: string; sourceId: string; value: number };
  "multiplier:removed": { stackId: string; sourceId: string };
  "multiplier:changed": { stackId: string; oldValue: number; newValue: number };

  "ui:notification": { message: string; type: "info" | "success" | "warning" | "error" };
  "ui:modal:open": { modalId: string };
  "ui:modal:close": { modalId: string };
  "ui:tab:changed": { tabId: string };

  // Cloud sync events
  "cloud:sync:start": Record<string, never>;
  "cloud:sync:success": { save?: unknown };
  "cloud:sync:error": { error: unknown };
  "cloud:sync:conflict": { localSave: unknown; cloudSave: unknown; localTimestamp: number; cloudTimestamp: number };
  "cloud:load:start": Record<string, never>;
  "cloud:load:success": { save: unknown };
  "cloud:load:error": { error: unknown };
  "cloud:load:empty": Record<string, never>;
  "cloud:offline:progress": { resourcesGained: Record<string, number>; offlineTimeMs: number; efficiencyApplied: number };
  "cloud:conflict:error": { error: unknown };
}

type EventCallback<T extends GameEventType> = (payload: GameEventPayload[T]) => void;

interface Subscription {
  id: number;
  type: GameEventType;
  callback: EventCallback<GameEventType>;
  once: boolean;
}

/**
 * Singleton event bus for game-wide communication
 */
class EventBusImpl {
  private subscriptions: Map<GameEventType, Subscription[]> = new Map();
  private nextId = 1;

  /**
   * Subscribe to an event
   */
  on<T extends GameEventType>(
    type: T,
    callback: EventCallback<T>
  ): () => void {
    return this.addSubscription(type, callback as EventCallback<GameEventType>, false);
  }

  /**
   * Subscribe to an event, automatically unsubscribe after first trigger
   */
  once<T extends GameEventType>(
    type: T,
    callback: EventCallback<T>
  ): () => void {
    return this.addSubscription(type, callback as EventCallback<GameEventType>, true);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T extends GameEventType>(type: T, payload: GameEventPayload[T]): void {
    const subs = this.subscriptions.get(type);
    if (!subs) return;

    const toRemove: number[] = [];

    for (const sub of subs) {
      try {
        sub.callback(payload);
        if (sub.once) {
          toRemove.push(sub.id);
        }
      } catch (error) {
        console.error(`EventBus: Error in handler for ${type}:`, error);
      }
    }

    // Remove one-time subscriptions
    if (toRemove.length > 0) {
      this.subscriptions.set(
        type,
        subs.filter((s) => !toRemove.includes(s.id))
      );
    }
  }

  /**
   * Remove all subscriptions for a specific event type
   */
  clear(type: GameEventType): void {
    this.subscriptions.delete(type);
  }

  /**
   * Remove all subscriptions
   */
  clearAll(): void {
    this.subscriptions.clear();
  }

  private addSubscription(
    type: GameEventType,
    callback: EventCallback<GameEventType>,
    once: boolean
  ): () => void {
    const id = this.nextId++;
    const subscription: Subscription = { id, type, callback, once };

    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }
    this.subscriptions.get(type)!.push(subscription);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(type);
      if (subs) {
        this.subscriptions.set(
          type,
          subs.filter((s) => s.id !== id)
        );
      }
    };
  }
}

// Export singleton instance
export const EventBus = new EventBusImpl();

/**
 * Helper to collect unsubscribe functions for cleanup
 */
export class SubscriptionManager {
  private unsubscribers: Array<() => void> = [];

  /**
   * Track a subscription for later cleanup
   */
  add(unsubscribe: () => void): void {
    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Subscribe to an event and track for cleanup
   */
  subscribe<T extends GameEventType>(
    type: T,
    callback: (payload: GameEventPayload[T]) => void
  ): void {
    this.add(EventBus.on(type, callback));
  }

  /**
   * Unsubscribe all tracked subscriptions
   */
  dispose(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
  }

  /**
   * Get count of active subscriptions
   */
  get count(): number {
    return this.unsubscribers.length;
  }
}
