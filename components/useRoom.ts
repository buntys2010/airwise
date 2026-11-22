"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "@/lib/i18n";
import { checkPick, prepareImage } from "@/lib/image";
import {
  SAMPLE_HOTSPOTS, SAMPLE_PROFILE_PATCH, mergeFindings, profilePatch, questionState, type Answers, type Hotspot, type QuestionId,
} from "@/lib/room";
import type { Airwise } from "./useAirwise";

export type Phase = "sample" | "reading" | "photo" | "checklist";

/** A status line: a translation key with values, or text that came from the server (shown as is). */
export type RoomMessage = { key: Key; vars?: Record<string, string | number> } | { raw: string } | null;

interface VisionReply {
  status: "ok" | "none" | "not_room" | "unreadable" | "unavailable";
  hotspots?: Hotspot[];
  reasonText?: string;
}

/**
 * Room state: the sample room by default, or the user's own photo once it has been read.
 * A photo contributes only VISIBLE evidence; the questions cover everything else; an explicit answer beats the photo.
 * Every outcome has a plain path forward, and the questions drive the same engine without any photo.
 */
export function useRoom(a: Airwise) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Hotspot[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>("sample");
  const [message, setMessage] = useState<RoomMessage>(null);
  const abort = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const { profile, setProfile } = a;

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); abort.current?.abort(); }, []);

  const setPhoto = (url: string | null) => {
    if (urlRef.current && urlRef.current !== url) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setPhotoUrl(url);
  };

  const hotspots = useMemo(() => (phase === "sample" ? SAMPLE_HOTSPOTS : mergeFindings(evidence, answers)), [phase, evidence, answers]);
  const questions = useMemo(() => questionState(evidence, answers), [evidence, answers]);

  /** Household facts follow the findings; code decides this, not the model. */
  const applyFindings = useCallback((found: Hotspot[]) => setProfile({ ...profile, ...profilePatch(found) }), [profile, setProfile]);

  const useSample = useCallback(() => {
    abort.current?.abort();
    setPhoto(null);
    setEvidence([]);
    setAnswers({});
    setPhase("sample");
    setMessage(null);
    setProfile({ ...profile, ...SAMPLE_PROFILE_PATCH });
  }, [profile, setProfile]);

  const pickFile = useCallback(async (file: File) => {
    const check = checkPick(file);
    if (!check.ok) {
      setMessage({ key: file.size > 15 * 1024 * 1024 ? "room.tooBig" : "room.badFormat" });
      setPhase(urlRef.current ? "checklist" : "sample");
      return;
    }
    abort.current?.abort(); // a second pick cancels the first request
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPhase("reading");
    setMessage({ key: "room.reading" });
    try {
      const prepared = await prepareImage(file);
      if (ctrl.signal.aborted) { URL.revokeObjectURL(prepared.objectUrl); return; }
      const res = await fetch("/api/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: prepared.dataUrl }), signal: ctrl.signal });
      const reply = (await res.json()) as VisionReply & { error?: string };
      if (ctrl.signal.aborted) { URL.revokeObjectURL(prepared.objectUrl); return; }
      if (!res.ok) {
        URL.revokeObjectURL(prepared.objectUrl);
        setMessage(reply.error ? { raw: reply.error } : { key: "room.failed" });
        setPhase(urlRef.current ? "photo" : "sample");
        return;
      }
      if (reply.status === "not_room") {
        URL.revokeObjectURL(prepared.objectUrl);
        setMessage({ key: "room.notRoom" });
        setPhase(urlRef.current ? "photo" : "sample");
        return;
      }
      setPhoto(prepared.objectUrl);
      setAnswers({}); // a new photo starts a new set of answers
      const found = reply.status === "ok" ? (reply.hotspots ?? []) : [];
      setEvidence(found);
      applyFindings(mergeFindings(found, {}));
      if (found.length) {
        setPhase("photo");
        setMessage({ key: "room.found", vars: { n: found.length } });
      } else {
        setPhase("checklist");
        setMessage(reply.status === "unavailable" ? { key: "room.unavailable", vars: { reason: reply.reasonText ?? "The photo reader is not available" } } : { key: "room.none" });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setPhase(urlRef.current ? "checklist" : "sample");
      setMessage({ key: e instanceof Error && e.message === "decode" ? "room.badFormat" : "room.failed" });
    }
  }, [applyFindings]);

  /** One-tap answer to a question the photo could not settle. */
  const answer = useCallback((q: QuestionId, yes: boolean) => {
    const next = { ...answers, [q]: yes };
    setAnswers(next);
    applyFindings(mergeFindings(evidence, next));
    setPhase((p) => (p === "sample" ? "checklist" : p));
  }, [answers, evidence, applyFindings]);

  return { photoUrl, hotspots, questions, phase, message, busy: phase === "reading", pickFile, useSample, answer };
}

export type Room = ReturnType<typeof useRoom>;
