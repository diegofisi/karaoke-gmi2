import { useEffect, useRef, useState, useCallback } from "react";

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useSpeechRecognition(language: string, isActive: boolean) {
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Map language codes
    const langMap: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
      ja: "ja-JP",
      ko: "ko-KR",
      fr: "fr-FR",
      de: "de-DE",
      pt: "pt-BR",
      it: "it-IT",
      zh: "zh-CN",
    };

    recognition.lang = langMap[language] || language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setFinalTranscript((prev) => prev + final);
      }
      setCurrentTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Restart if still active
      if (isActiveRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    return () => {
      try {
        recognition.stop();
      } catch {
        // Not started
      }
    };
  }, [language]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setFinalTranscript("");
    setCurrentTranscript("");
    try {
      recognition.start();
    } catch {
      // Already started
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      // Not started
    }
  }, []);

  const reset = useCallback(() => {
    setFinalTranscript("");
    setCurrentTranscript("");
  }, []);

  return {
    currentTranscript,
    finalTranscript,
    fullText: finalTranscript + currentTranscript,
    supported,
    start,
    stop,
    reset,
  };
}
