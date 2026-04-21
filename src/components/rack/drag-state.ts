"use client";

import { useEffect, useState } from "react";
import type { DropPayload } from "./types";

type Listener = (payload: DropPayload | null) => void;

let current: DropPayload | null = null;
const listeners = new Set<Listener>();

export function setDragPayload(payload: DropPayload | null) {
  current = payload;
  for (const l of listeners) l(payload);
}

export function getDragPayload() {
  return current;
}

export function useDragPayload(): DropPayload | null {
  const [state, setState] = useState<DropPayload | null>(current);
  useEffect(() => {
    listeners.add(setState);
    setState(current);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}
