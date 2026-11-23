"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "@/lib/i18n";
import { MAX_PICK_BYTES, checkPick, prepareImage } from "@/lib/image";
import {
  SAMPLE_HOTSPOTS,
  SAMPLE_PROFILE_PATCH,
  mergeFindings,
  profilePatch,
  questionState,
  type Answers,
  type Hotspot,
  type QuestionId,
} from "@/lib/room";
import type { Airwise } from "./useAirwise";

export type Phase = "sample" | "reading" | "photo" | "checklist";

/** A status line: a translation key with values, or text that came from the server (shown as is). */
export type RoomMessage =
  { key: Key; vars?: Record<string, string | number> } | { raw: string } | null;

interface VisionReply {
  status: "ok" | "none" | "not_room" | "unreadable" | "unavailable";
  hotspots?: Hotspot[];
  reasonText?: string;
}

type Analysis =
  | { accepted: false; message: RoomMessage }
  | { accepted: true; found: Hotspot[]; message: RoomMessage };

/** Sends the prepared photo to the vision route and turns the reply into what the screen should do next. */
async function analysePhoto(dataUrl: string, signal: AbortSignal): Promise<Analysis> {
  const res = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
    signal,
  });
  const reply = (await res.json()) as VisionReply & { error?: string };
  if (!res.ok)
    return {
      accepted: false,
      message: reply.error ? { raw: reply.error } : { key: "room.failed" },
    };
  if (reply.status === "not_room") return { accepted: false, message: { key: "room.notRoom" } };
  const found = reply.status === "ok" ? (reply.hotspots ?? []) : [];
  if (found.length)
    return { accepted: true, found, message: { key: "room.found", vars: { n: found.length } } };
  const message: RoomMessage =
    reply.status === "unavailable"
      ? {
          key: "room.unavailable",
          vars: { reason: reply.reasonText ?? "The photo reader is not available" },
        }
      : { key: "room.none" };
  return { accepted: true, found, message };
}

/**
 * Room state: the sample room by default, or the user's own photo once it has been read.
 * A photo contributes only VISIBLE evidence; the questions cover everything else; an explicit answer beats the photo.
 * Every outcome has a plain path forward, and the questions drive the same engine without any photo.
 */
const invalidPickKey = (file: File) =>
  file.size > MAX_PICK_BYTES ? ("room.tooBig" as const) : ("room.badFormat" as const);
const failureKey = (e: unknown) =>
  e instanceof Error && e.message === "decode"
    ? ("room.badFormat" as const)
    : ("room.failed" as const);

/** Room-photo state: the picked photo, the model's findings, the user's answers and the resulting profile changes. */
export function useRoom(a: Airwise) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Hotspot[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>("sample");
  const [message, setMessage] = useState<RoomMessage>(null);
  const abort = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const { setProfile } = a;

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      abort.current?.abort();
    },
    [],
  );

  const setPhoto = (url: string | null) => {
    if (urlRef.current && urlRef.current !== url) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setPhotoUrl(url);
  };

  const hotspots = useMemo(
    () => (phase === "sample" ? SAMPLE_HOTSPOTS : mergeFindings(evidence, answers)),
    [phase, evidence, answers],
  );
  const questions = useMemo(() => questionState(evidence, answers), [evidence, answers]);

  /** Household facts follow the findings; code decides this, not the model. */
  const applyFindings = useCallback(
    (found: Hotspot[], given: Answers) =>
      setProfile((cur) => ({ ...cur, ...profilePatch(found, given, cur) })),
    [setProfile],
  );

  const useSample = useCallback(() => {
    abort.current?.abort();
    setPhoto(null);
    setEvidence([]);
    setAnswers({});
    setPhase("sample");
    setMessage(null);
    setProfile((cur) => ({ ...cur, ...SAMPLE_PROFILE_PATCH }));
  }, [setProfile]);

  const pickFile = useCallback(
    async (file: File) => {
      const check = checkPick(file);
      if (!check.ok) {
        setMessage({ key: invalidPickKey(file) });
        setPhase(urlRef.current ? "checklist" : "sample");
        return;
      }
      abort.current?.abort(); // a second pick cancels the first request
      const ctrl = new AbortController();
      abort.current = ctrl;
      setPhase("reading");
      setMessage({ key: "room.reading" });
      let pendingUrl: string | null = null; // the new photo's object URL until it is adopted or discarded
      try {
        const prepared = await prepareImage(file);
        pendingUrl = prepared.objectUrl;
        const result = await analysePhoto(prepared.dataUrl, ctrl.signal);
        if (ctrl.signal.aborted) return;
        if (!result.accepted) {
          setMessage(result.message);
          setPhase(urlRef.current ? "photo" : "sample");
          return;
        }
        setPhoto(prepared.objectUrl);
        pendingUrl = null;
        setAnswers({}); // a new photo starts a new set of answers
        setEvidence(result.found);
        applyFindings(mergeFindings(result.found, {}), {});
        setPhase(result.found.length ? "photo" : "checklist");
        setMessage(result.message);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setPhase(urlRef.current ? "checklist" : "sample");
        setMessage({ key: failureKey(e) });
      } finally {
        if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      }
    },
    [applyFindings],
  );

  /** One-tap answer to a question the photo could not settle. */
  const answer = useCallback(
    (q: QuestionId, yes: boolean) => {
      const next = { ...answers, [q]: yes };
      setAnswers(next);
      applyFindings(mergeFindings(evidence, next), next);
      setPhase((p) => (p === "sample" ? "checklist" : p));
    },
    [answers, evidence, applyFindings],
  );

  return {
    photoUrl,
    hotspots,
    questions,
    phase,
    message,
    busy: phase === "reading",
    pickFile,
    useSample,
    answer,
  };
}

export type Room = ReturnType<typeof useRoom>;
