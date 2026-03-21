import { useState, useCallback } from "react";
import type { LyricSegment } from "../types";

export interface LyricsSyncState {
  currentSegmentIndex: number;
  currentWordIndex: number;
}

export function useLyricsSync(lyrics: LyricSegment[]) {
  const [syncState, setSyncState] = useState<LyricsSyncState>({
    currentSegmentIndex: -1,
    currentWordIndex: -1,
  });

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

      setSyncState({ currentSegmentIndex: segIdx, currentWordIndex: wordIdx });
    },
    [lyrics]
  );

  return { ...syncState, update };
}
