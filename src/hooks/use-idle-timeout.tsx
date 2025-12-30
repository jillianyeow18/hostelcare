import { useEffect, useRef, useCallback } from "react";

interface UseIdleTimeoutOptions {
  onIdle: () => void;
  idleTime?: number; // milliseconds
  events?: string[];
}

/**
 * Hook to detect user inactivity and trigger a callback
 * @param onIdle - Callback function to execute when user is idle
 * @param idleTime - Time in milliseconds before considering user idle (default: 15 minutes)
 * @param events - Array of events to listen for user activity
 */
export const useIdleTimeout = ({
  onIdle,
  idleTime = 15 * 60 * 1000, // 15 minutes default
  events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ],
}: UseIdleTimeoutOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onIdleRef = useRef(onIdle);

  // Update the ref when onIdle changes
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onIdleRef.current();
    }, idleTime);
  }, [idleTime]);

  useEffect(() => {
    // Set initial timer
    resetTimer();

    // Add event listeners for user activity
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [events, resetTimer]);

  return { resetTimer };
};
