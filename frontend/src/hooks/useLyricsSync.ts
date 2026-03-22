import { useState, useCallback, useRef } from "react";
import type { LyricSegment } from "../types";

export interface LyricsSyncState {
  currentSegmentIndex: number;
  currentWordIndex: number;
  /** Always points to a valid segment (last sung or next upcoming), even during gaps */
  displaySegmentIndex: number;
  /** True when we're between segments (instrumental / gap) */
  isInGap: boolean;
}

export function useLyricsSync(lyrics: LyricSegment[]) {
  const [syncState, setSyncState] = useState<LyricsSyncState>({
    currentSegmentIndex: -1,
    currentWordIndex: -1,
    displaySegmentIndex: 0,
    isInGap: true,
  });

  const lastActiveSegRef = useRef(0);

  const update = useCallback(
    (currentTime: number) => {
      let segIdx = -1;
      let wordIdx = -1;

      for (let i = 0; i < lyrics.length; i++) {
        const seg = lyrics[i];
        if (currentTime >= seg.start && currentTime <= seg.end + 0.3) {
          segIdx = i;
          for (let j = 0; j < seg.words.length; j++) {
            const w = seg.words[j];
            if (currentTime >= w.start && currentTime <= w.end + 0.1) {
              wordIdx = j;
            }
          }
          break;
        }
      }

      // Track display segment: during gaps, show the next upcoming or last played
      let displayIdx = lastActiveSegRef.current;
      if (segIdx >= 0) {
        displayIdx = segIdx;
        lastActiveSegRef.current = segIdx;
      } else if (lyrics.length > 0) {
        // Find next upcoming segment
        for (let i = 0; i < lyrics.length; i++) {
          if (lyrics[i].start > currentTime) {
            displayIdx = i;
            break;
          }
          // If we passed this segment, it's the last one played
          if (lyrics[i].end < currentTime) {
            displayIdx = Math.min(i + 1, lyrics.length - 1);
          }
        }
      }

      setSyncState({
        currentSegmentIndex: segIdx,
        currentWordIndex: wordIdx,
        displaySegmentIndex: displayIdx,
        isInGap: segIdx === -1,
      });
    },
    [lyrics]
  );

  return { ...syncState, update };
}
