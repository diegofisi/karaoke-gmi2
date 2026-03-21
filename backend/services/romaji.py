import pykakasi


_kakasi = None


def get_kakasi():
    global _kakasi
    if _kakasi is None:
        _kakasi = pykakasi.kakasi()
    return _kakasi


def to_romaji(text: str) -> str:
    kakasi = get_kakasi()
    result = kakasi.convert(text)
    return " ".join(item["hepburn"] for item in result)


def add_romaji_to_transcription(transcription: dict) -> dict:
    if transcription.get("language") != "ja":
        return transcription

    for segment in transcription.get("segments", []):
        segment["romaji"] = to_romaji(segment["text"])
        for word in segment.get("words", []):
            word["romaji"] = to_romaji(word["word"])

    return transcription
