"use client";
/** Voice input and read-aloud for the chat card. */

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

interface RecognitionHandlers {
  onTranscript: (text: string) => void;
  onMessage: (key: Key | null) => void;
  onEnd: () => void;
}

/** Starts one speech-recognition session. Returns null (and says why) when it cannot start. */
function startRecognition(lang: Lang, h: RecognitionHandlers): RecognitionLike | null {
  const Ctor = getRecognitionCtor(window as never);
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = SPEECH_LANG[lang];
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => {
    const text = transcriptOf(e);
    if (text) h.onTranscript(text);
    h.onMessage(text ? "voice.review" : "voice.nospeech");
  };
  r.onerror = (e) => h.onMessage(VOICE_PROBLEM_KEY[mapVoiceError(e.error)]);
  r.onend = h.onEnd;
  h.onMessage(null);
  try {
    r.start();
    return r;
  } catch {
    h.onMessage("voice.error");
    return null;
  }
}

/**
 * Voice input and read-aloud, feature-detected, and never sends anything by itself:
 * a transcript lands in the question box for the user to check and send.
 */
export function useVoice(lang: Lang, onTranscript: (text: string) => void) {
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<Key | null>(null);
  const [speakSupported, setSpeakSupported] = useState(false);
  const [readAloud, setReadAloud] = useState(false); // off by default
  const rec = useRef<RecognitionLike | null>(null);
  const readRef = useRef(false);

  useEffect(() => {
    setMicSupported(getRecognitionCtor(window as never) !== null);
    setSpeakSupported(canSpeak(window));
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
    const r = startRecognition(lang, {
      onTranscript,
      onMessage: setVoiceMsg,
      onEnd: () => setListening(false),
    });
    rec.current = r;
    setListening(r !== null);
  }, [lang, listening, onTranscript]);

  /** Reads an answer aloud, but only when the user has turned read-aloud on. */
  const speakIfEnabled = useCallback(
    (text: string) => {
      if (readRef.current) speak(text, SPEECH_LANG[lang]);
    },
    [lang],
  );

  return {
    micSupported,
    listening,
    voiceMsg,
    clearVoiceMsg: () => setVoiceMsg(null),
    toggleMic,
    speakSupported,
    readAloud,
    setReadAloud,
    speakIfEnabled,
  };
}
