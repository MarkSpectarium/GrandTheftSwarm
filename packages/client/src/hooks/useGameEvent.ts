import { useEffect, useCallback, useRef } from 'react';
import { EventBus, type GameEventPayload } from '../core/EventBus';

/**
 * Subscribe to a game event
 */
export function useGameEvent<K extends keyof GameEventPayload>(
  eventType: K,
  callback: (payload: GameEventPayload[K]) => void
) {
  // Use ref to avoid recreating subscription on callback change
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (payload: GameEventPayload[K]) => {
      callbackRef.current(payload);
    };

    const unsubscribe = EventBus.on(eventType, handler);

    return () => {
      unsubscribe();
    };
  }, [eventType]);
}

/**
 * Subscribe to a game event once
 */
export function useGameEventOnce<K extends keyof GameEventPayload>(
  eventType: K,
  callback: (payload: GameEventPayload[K]) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (payload: GameEventPayload[K]) => {
      callbackRef.current(payload);
    };

    EventBus.once(eventType, handler);

    // No cleanup needed for once
  }, [eventType]);
}

/**
 * Get a function to emit game events
 */
export function useEmitGameEvent() {
  return useCallback(<K extends keyof GameEventPayload>(
    eventType: K,
    payload: GameEventPayload[K]
  ) => {
    EventBus.emit(eventType, payload);
  }, []);
}
