"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Lang } from "@/lib/chat";
import { type Key, SPEECH_LANG } from "@/lib/i18n";
import {
  canSpeak,
  getRecognitionCtor,
  mapVoiceError,
  type RecognitionLike,
  speak,
  stopSpeaking,
  transcriptOf,
  VOICE_PROBLEM_KEY,
} from "@/lib/voice";

type SpeechWindow = Parameters<typeof getRecognitionCtor>[0] & Parameters<typeof canSpeak>[0];
const speechWindow = () => window as unknown as SpeechWindow;

/**
 * Voice input and read-aloud for the chat. Feature-detected, and it never sends anything by
 * itself: the transcript goes to
 * `onTranscript` so the user can check it before sending. Read-aloud is off until the user turns it on.
 */
export function useVoice(lang: Lang, onTranscript: (text: string) => void) {
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<Key | null>(null);
  const [speakSupported, setSpeakSupported] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const rec = useRef<RecognitionLike | null>(null);
  const readRef = useRef(false);

  useEffect(() => {
    setMicSupported(getRecognitionCtor(speechWindow()) !== null);
    setSpeakSupported(canSpeak(speechWindow()));
    return () => {
      rec.current?.abort();
      stopSpeaking();
    };
  }, []);
  useEffect(() => {
    readRef.current = readAloud;
    if (!readAloud) stopSpeaking();
  }, [readAloud]);

  const toggleMic = useCallback(() => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor(speechWindow());
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = SPEECH_LANG[lang];
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const text = transcriptOf(e);
      if (text) onTranscript(text);
      setMessage(text ? "voice.review" : "voice.nospeech");
    };
    recognition.onerror = (e) => setMessage(VOICE_PROBLEM_KEY[mapVoiceError(e.error)]);
    recognition.onend = () => setListening(false);
    rec.current = recognition;
    setMessage(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      setMessage("voice.error");
    }
  }, [listening, lang, onTranscript]);

  /** Reads an answer aloud, but only if the user has turned that on. */
  const readOut = useCallback(
    (text: string) => {
      if (readRef.current) speak(text, SPEECH_LANG[lang]);
    },
    [lang],
  );
  const clearMessage = useCallback(() => setMessage(null), []);

  return {
    micSupported,
    listening,
    message,
    clearMessage,
    toggleMic,
    speakSupported,
    readAloud,
    setReadAloud,
    readOut,
  };
}
