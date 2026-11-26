"use client";
/** Room state: sample or photo, findings, questions and status. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type Answers,
  type Hotspot,
  mergeFindings,
  profilePatch,
  type QuestionId,
  questionState,
  SAMPLE_HOTSPOTS,
  SAMPLE_PROFILE_PATCH,
} from "@/lib/room";

import type { Airwise } from "../useAirwise";
import { type ReadOutcome, readPhoto, rejectionFor, type RoomMessage } from "./readPhoto";

export type { RoomMessage } from "./readPhoto";
export type Phase = "sample" | "reading" | "photo" | "checklist";

/** The photo's object URL, released when it is replaced or the component goes away. */
function usePhotoUrl() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  const setPhoto = useCallback((url: string | null) => {
    if (urlRef.current && urlRef.current !== url) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setPhotoUrl(url);
  }, []);
  return { photoUrl, setPhoto, hasPhoto: () => urlRef.current !== null };
}

/** What the photo and the answers say about the room, and the household facts that follow from them. */
function useFindings(a: Airwise, phase: Phase, onAnswered: () => void) {
  const [evidence, setEvidence] = useState<Hotspot[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const { profile, setProfile } = a;

  const hotspots = useMemo(
    () => (phase === "sample" ? SAMPLE_HOTSPOTS : mergeFindings(evidence, answers)),
    [phase, evidence, answers],
  );
  const questions = useMemo(() => questionState(evidence, answers), [evidence, answers]);

  /** Household facts follow the findings; code decides this, not the model. */
  const applyFindings = useCallback(
    (found: Hotspot[]) => setProfile({ ...profile, ...profilePatch(found) }),
    [profile, setProfile],
  );

  /** A new photo's evidence replaces the old, and starts a new set of answers. */
  const setPhotoEvidence = useCallback(
    (found: Hotspot[]) => {
      setAnswers({});
      setEvidence(found);
      applyFindings(mergeFindings(found, {}));
    },
    [applyFindings],
  );

  /** Back to the sample room's household. */
  const resetToSample = useCallback(() => {
    setEvidence([]);
    setAnswers({});
    setProfile({ ...profile, ...SAMPLE_PROFILE_PATCH });
  }, [profile, setProfile]);

  /** One-tap answer to a question the photo could not settle. */
  const answer = useCallback(
    (q: QuestionId, yes: boolean) => {
      const next = { ...answers, [q]: yes };
      setAnswers(next);
      applyFindings(mergeFindings(evidence, next));
      onAnswered();
    },
    [answers, evidence, applyFindings, onAnswered],
  );

  return { hotspots, questions, answer, setPhotoEvidence, resetToSample };
}

/** The phase to show after something other than a successful read; without a photo on screen it is always the sample. */
function phaseAfter(outcome: Exclude<ReadOutcome, { kind: "read" | "aborted" }>, hasPhoto: boolean): Phase {
  if (!hasPhoto) return "sample";
  if (outcome.kind === "failed") return outcome.fallback;
  return outcome.kind === "not_room" ? "photo" : "checklist";
}

/**
 * Room state: the sample room by default, or the user's own photo once it has been read.
 * A photo contributes only VISIBLE evidence; the questions cover everything else; an explicit answer beats the photo.
 * Every outcome has a plain path forward, and the questions drive the same engine without any photo.
 */
export function useRoom(a: Airwise) {
  const { photoUrl, setPhoto, hasPhoto } = usePhotoUrl();
  const [phase, setPhase] = useState<Phase>("sample");
  const [message, setMessage] = useState<RoomMessage>(null);
  const abort = useRef<AbortController | null>(null);
  const findings = useFindings(a, phase, () => setPhase((p) => (p === "sample" ? "checklist" : p)));
  const { setPhotoEvidence, resetToSample } = findings;

  useEffect(() => () => abort.current?.abort(), []);

  const useSample = useCallback(() => {
    abort.current?.abort();
    setPhoto(null);
    resetToSample();
    setPhase("sample");
    setMessage(null);
  }, [resetToSample, setPhoto]);

  /** Applies what reading a photo turned up. */
  const applyOutcome = useCallback(
    (outcome: ReadOutcome) => {
      if (outcome.kind === "aborted") return;
      if (outcome.kind === "read") {
        setPhoto(outcome.objectUrl);
        setPhotoEvidence(outcome.found);
        setPhase(outcome.found.length ? "photo" : "checklist");
        setMessage(outcome.message);
        return;
      }
      setPhase(phaseAfter(outcome, hasPhoto()));
      setMessage(outcome.kind === "not_room" ? { key: "room.notRoom" } : outcome.message);
    },
    [hasPhoto, setPhoto, setPhotoEvidence],
  );

  const pickFile = useCallback(
    async (file: File) => {
      const rejection = rejectionFor(file);
      if (rejection) return applyOutcome(rejection);
      abort.current?.abort(); // a second pick cancels the first request
      const ctrl = new AbortController();
      abort.current = ctrl;
      setPhase("reading");
      setMessage({ key: "room.reading" });
      applyOutcome(await readPhoto(file, ctrl.signal));
    },
    [applyOutcome],
  );

  return {
    photoUrl,
    hotspots: findings.hotspots,
    questions: findings.questions,
    phase,
    message,
    busy: phase === "reading",
    pickFile,
    useSample,
    answer: findings.answer,
  };
}

export type Room = ReturnType<typeof useRoom>;
