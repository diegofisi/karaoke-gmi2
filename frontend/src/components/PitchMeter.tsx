import { useRef, useEffect } from "react";
import {
  createNativePitchMeter,
  type NativePitchMeterHandle,
} from "./NativePitchMeter";

interface Props {
  userPitch: number | null;
  refPitch: number | null;
  rating: "perfect" | "great" | "good" | "miss" | null;
}

/**
 * Thin React wrapper around the native JS pitch meter.
 * Props are written directly to the native state object —
 * NO React re-renders drive the canvas drawing.
 */
export default function PitchMeter({ userPitch, refPitch, rating }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<NativePitchMeterHandle | null>(null);

  // Mount the native pitch meter once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handle = createNativePitchMeter(el);
    handleRef.current = handle;

    return () => {
      handle.destroy();
      handleRef.current = null;
    };
  }, []);

  // Push data into the native state object (no re-render needed)
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    h.state.userPitch = userPitch;
    h.state.refPitch = refPitch;
    h.state.rating = rating;
  }, [userPitch, refPitch, rating]);

  return <div ref={containerRef} />;
}
