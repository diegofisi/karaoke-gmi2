import numpy as np
import librosa
from sklearn.cluster import AgglomerativeClustering


def detect_speakers(vocals_path, segments: list[dict], max_speakers: int = 4) -> tuple[list[dict], int]:
    """
    Detect multiple speakers by clustering audio segments based on MFCCs.
    Assigns a speaker_id to each segment.
    Returns updated segments and speaker count.
    """
    if len(segments) < 2:
        for seg in segments:
            seg["speaker"] = 0
            for w in seg.get("words", []):
                w["speaker"] = 0
        return segments, 1

    y, sr = librosa.load(str(vocals_path), sr=22050, mono=True)

    # Extract MFCC features per segment
    embeddings = []
    valid_indices = []

    for i, seg in enumerate(segments):
        start_sample = int(seg["start"] * sr)
        end_sample = int(seg["end"] * sr)

        if end_sample <= start_sample or end_sample > len(y):
            continue

        segment_audio = y[start_sample:end_sample]

        if len(segment_audio) < sr * 0.3:  # Skip segments shorter than 300ms
            continue

        mfcc = librosa.feature.mfcc(y=segment_audio, sr=sr, n_mfcc=20)
        embedding = np.mean(mfcc, axis=1)
        embeddings.append(embedding)
        valid_indices.append(i)

    if len(embeddings) < 2:
        for seg in segments:
            seg["speaker"] = 0
            for w in seg.get("words", []):
                w["speaker"] = 0
        return segments, 1

    X = np.array(embeddings)

    # Use silhouette score to find optimal number of clusters (2 to max_speakers)
    best_n = 1
    best_score = -1

    for n in range(2, min(max_speakers + 1, len(embeddings))):
        try:
            clustering = AgglomerativeClustering(n_clusters=n)
            labels = clustering.fit_predict(X)

            from sklearn.metrics import silhouette_score
            score = silhouette_score(X, labels)

            if score > best_score and score > 0.15:  # Threshold to avoid false splits
                best_score = score
                best_n = n
        except Exception:
            continue

    # Final clustering
    if best_n > 1:
        clustering = AgglomerativeClustering(n_clusters=best_n)
        labels = clustering.fit_predict(X)
    else:
        labels = [0] * len(embeddings)

    # Assign speaker IDs
    for seg in segments:
        seg["speaker"] = 0
        for w in seg.get("words", []):
            w["speaker"] = 0

    for idx, label in zip(valid_indices, labels):
        segments[idx]["speaker"] = int(label)
        for w in segments[idx].get("words", []):
            w["speaker"] = int(label)

    return segments, best_n
