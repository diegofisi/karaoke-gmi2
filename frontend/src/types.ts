export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  romaji?: string;
  speaker: number;
}

export interface LyricSegment {
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
  speaker: number;
  romaji?: string;
}

export interface PitchData {
  timestamps: number[];
  pitches_hz: (number | null)[];
  pitches_midi: (number | null)[];
  voiced: boolean[];
  sample_rate: number;
  hop_length: number;
}

export interface SongStatus {
  id: string;
  status: string;
  progress: number;
  title?: string;
  error?: string;
}

export interface LibrarySong {
  video_id: string;
  title: string;
  language: string;
  duration: number;
  speakers_count: number;
}

export interface SongData {
  id: string;
  title: string;
  duration: number;
  language: string;
  instrumental_url: string;
  vocals_url: string;
  lyrics: LyricSegment[];
  pitch_data: PitchData;
  speakers_count: number;
}
