"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  InterviewSession,
  MonitoringEvent,
  MonitoringConsent,
  SubmitAnswerInput,
} from "@/contracts";
import { fixtureAnswers, fixtureSession } from "@/fixtures/interview";
import { api, ApiError } from "@/lib/api-client";
import { MockIntelligence } from "@/modules/intelligence";
import { MonitoringPanel, type MonitoringHandle } from "@/modules/monitoring";
import {
  clearDraft,
  describeApiFailure,
  readDraft,
  writeDraft,
} from "../draft-storage";
import { DevicePreflight } from "./device-preflight";
import { QuestionPlayback } from "./question-playback";
import {
  ReconnectBanner,
  SessionErrorPanel,
  SessionLoadingPanel,
} from "./session-status";
import {
  VoiceAnswerControls,
  type CreateSpeechCapture,
} from "./voice-answer-controls";

export function InterviewExperience({
  sessionId,
  fixture = false,
  createSpeechCapture,
}: {
  sessionId: string;
  fixture?: boolean;
  /** Optional override so C can inject stream-owned capture later. */
  createSpeechCapture?: CreateSpeechCapture;
}) {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(
    fixture ? structuredClone(fixtureSession) : null,
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const monitoringRef = useRef<MonitoringHandle>(null);
  const [loadPhase, setLoadPhase] = useState<"loading" | "reconnecting" | "ready" | "error">(
    fixture ? "ready" : "loading",
  );
  const [loadFailure, setLoadFailure] = useState<{
    title: string;
    message: string;
    retryable: boolean;
  } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitRetryable, setSubmitRetryable] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const submission = useRef<SubmitAnswerInput | null>(null);
  const submitting = useRef(false);
  const draftQuestionId = useRef<string | null>(null);

  const loadSession = useCallback(
    async (mode: "loading" | "reconnecting" = "loading") => {
      if (fixture) return;
      setLoadPhase(mode);
      setLoadFailure(null);
      try {
        const value = await api.getSession(sessionId);
        setSession(value);
        setLoadPhase("ready");
        if (value.status === "completed") router.replace(`/reports/${value.id}`);
      } catch (error) {
        const described = describeApiFailure(error);
        setLoadFailure({
          title: described.title,
          message: described.message,
          retryable: described.retryable,
        });
        setLoadPhase("error");
      }
    },
    [fixture, sessionId, router],
  );

  useEffect(() => {
    if (fixture) return;
    void loadSession("loading");
  }, [fixture, loadSession]);

  // Restore / persist draft only for the active question ID.
  useEffect(() => {
    const questionId = session?.activeQuestionId;
    if (!questionId) {
      setDraft("");
      draftQuestionId.current = null;
      return;
    }
    if (draftQuestionId.current !== questionId) {
      draftQuestionId.current = questionId;
      setDraft(readDraft(sessionId, questionId));
      submission.current = null;
    }
  }, [session?.activeQuestionId, sessionId]);

  useEffect(() => {
    const questionId = session?.activeQuestionId;
    if (!questionId || draftQuestionId.current !== questionId) return;
    writeDraft(sessionId, questionId, draft);
  }, [draft, session?.activeQuestionId, sessionId]);

  const onEvents = useCallback(
    async (events: MonitoringEvent[], signal?: AbortSignal) => {
      if (!fixture) await api.addEvents(sessionId, events, signal);
      setSession((current) =>
        current
          ? {
              ...current,
              events: [
                ...new Map(
                  [...current.events, ...events].map((event) => [event.id, event]),
                ).values(),
              ],
            }
          : current,
      );
    },
    [sessionId, fixture],
  );

  const onConsentChange = useCallback(
    async (monitoring: MonitoringConsent) => {
      if (!fixture) await api.updateMonitoringConsent(sessionId, monitoring);
      setSession((current) =>
        current ? { ...current, config: { ...current.config, monitoring } } : current,
      );
    },
    [fixture, sessionId],
  );
  const onTranscriptText = useCallback((text: string, _final: boolean) => {
    setDraft(text);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.activeQuestionId || submitting.current || !draft.trim()) return;
    if (!fixture && !monitoringRef.current?.isReady()) {
      setSubmitError(
        "Camera and microphone must both be running. Start or retry your devices; your answer is preserved.",
      );
      return;
    }
    submitting.current = true;
    setPending(true);
    setSubmitError("");
    setSubmitRetryable(false);
    const text = draft.trim();
    if (
      submission.current?.text !== text ||
      submission.current?.questionId !== session.activeQuestionId
    ) {
      submission.current = {
        submissionId: crypto.randomUUID(),
        questionId: session.activeQuestionId,
        text,
      };
    }
    try {
      if (session.answers.length + 1 >= session.config.questionCount) {
        await monitoringRef.current?.finish();
      }
      let next: InterviewSession;
      if (fixture) {
        const assessment = await new MockIntelligence().assessAnswer(session, submission.current);
        const answers = [
          ...session.answers,
          {
            ...submission.current,
            submittedAt: new Date().toISOString(),
            mode: "mock" as const,
            feedback: assessment.feedback,
          },
        ];
        const complete = answers.length >= session.config.questionCount;
        next = {
          ...session,
          answers,
          revision: session.revision + 1,
          status: complete ? "completed" : "in_progress",
          completedAt: complete ? new Date().toISOString() : null,
          questions: complete ? session.questions : [...session.questions, assessment.nextQuestion],
          activeQuestionId: complete ? null : assessment.nextQuestion.id,
        };
      } else next = await api.submitAnswer(sessionId, submission.current);
      clearDraft(sessionId, session.activeQuestionId);
      setSession(next);
      setDraft("");
      submission.current = null;
      if (!fixture && next.status === "completed") router.push(`/reports/${sessionId}`);
    } catch (error) {
      monitoringRef.current?.resume();
      const described = describeApiFailure(error);
      setSubmitError(described.message);
      setSubmitRetryable(described.retryable);
      if (
        error instanceof ApiError &&
        (error.code === "STALE_QUESTION" || error.code === "IDEMPOTENCY_CONFLICT")
      ) {
        void loadSession("reconnecting");
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (!fixture && loadPhase === "loading") {
    return <SessionLoadingPanel phase="loading" />;
  }
  if (!fixture && loadPhase === "reconnecting" && !session) {
    return <SessionLoadingPanel phase="reconnecting" />;
  }
  if (!fixture && loadPhase === "error" && loadFailure) {
    return (
      <SessionErrorPanel
        title={loadFailure.title}
        message={loadFailure.message}
        retryable={loadFailure.retryable}
        onRetry={loadFailure.retryable ? () => void loadSession("reconnecting") : undefined}
      />
    );
  }

  if (!session) {
    return <SessionLoadingPanel phase="loading" />;
  }

  const question = session.questions.find((item) => item.id === session.activeQuestionId);
  const feedback = session.answers.at(-1)?.feedback;

  return (
    <main className="container">
      {loadPhase === "reconnecting" && session && (
        <ReconnectBanner
          message="Reconnecting to refresh session state. Your drafted answer stays in this browser."
          onRetry={() => void loadSession("reconnecting")}
          busy={pending}
        />
      )}
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {session.config.role} / {session.config.difficulty}
          </p>
          <h1 className="room-title">Think it through.</h1>
        </div>
        <div className="row">
          <span className="badge">
            {fixture ? "Fixture only" : session.mode === "mock" ? "Mock feedback" : "Live model"}
          </span>
          <span className="badge">
            {session.answers.length} / {session.config.questionCount} answered
          </span>
          {ttsPlaying && <span className="badge">App TTS active</span>}
        </div>
      </div>
      {fixture && (
        <p className="notice">
          Independent component fixture. Answers stay in this page, reset on reload, and do not call
          the session API.
        </p>
      )}
      <div className="two-column">
        <div className="stack">
          <DevicePreflight consent={session.config.monitoring} required={!fixture} />
          <section className="panel stack">
            {question && !fixture && !mediaReady ? (
              <div className="stack">
                <h2>Allow camera and microphone to begin</h2>
                <p>
                  Both devices are mandatory for this practice session. Enable consent if needed and
                  click Start camera and Start microphone in the device panel. Your browser controls
                  permission; we cannot override a denial.
                </p>
                <p>Your draft is preserved if a device stops. No video or audio is uploaded.</p>
                <Link href="/">Leave interview</Link>
              </div>
            ) : question ? (
              <>
                <div>
                  <p className="eyebrow">
                    {question.kind === "follow_up"
                      ? "Follow-up / apply your reasoning"
                      : "Opening question"}
                  </p>
                  <h2 className="question">{question.text}</h2>
                  <p className="muted">{question.topic}</p>
                </div>
                <QuestionPlayback
                  text={question.text}
                  questionId={question.id}
                  onPlayingChange={setTtsPlaying}
                />
                <form className="stack" onSubmit={submit}>
                  <label>
                    Your answer
                    <textarea
                      rows={8}
                      maxLength={12000}
                      value={draft}
                      disabled={pending}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Explain your approach, a tradeoff, and how you would verify it…"
                    />
                  </label>
                  <VoiceAnswerControls
                    disabled={pending || ttsPlaying}
                    onTranscriptText={onTranscriptText}
                    createSpeechCapture={createSpeechCapture}
                  />
                  <div className="row">
                    <button
                      className="button"
                      disabled={pending || !draft.trim() || (!fixture && !mediaReady)}
                    >
                      {pending ? "Reviewing your answer…" : "Submit answer →"}
                    </button>
                    {session.mode === "mock" && (
                      <button
                        className="button secondary"
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setDraft(
                            fixtureAnswers[
                              Math.min(session.answers.length, fixtureAnswers.length - 1)
                            ],
                          )
                        }
                      >
                        Use sample answer
                      </button>
                    )}
                    {submitError && submitRetryable && (
                      <button
                        className="button secondary"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const form = document.querySelector("form");
                          form?.requestSubmit();
                        }}
                      >
                        Retry submit
                      </button>
                    )}
                  </div>
                  <p className="small muted">
                    Drafts restore after refresh for this question only. Voice transcript is editable
                    before submit; text fallback always remains.
                  </p>
                </form>
              </>
            ) : (
              <>
                <h2>Practice complete</h2>
                <p>
                  {fixture
                    ? "The fixture journey is complete. Start a saved practice session to open a report."
                    : "Your report is ready."}
                </p>
                <Link className="text-link" href={fixture ? "/" : `/reports/${sessionId}`}>
                  {fixture ? "Start a practice session →" : "Open report →"}
                </Link>
              </>
            )}
            {submitError && (
              <p role="alert" className="error">
                {submitError}
              </p>
            )}
          </section>
          {feedback && (
            <section className="panel stack" aria-live="polite">
              <div>
                <p className="eyebrow">Answer-grounded feedback</p>
                <h2>Reflect before the next question</h2>
              </div>
              <blockquote>“{feedback.evidenceQuote}”</blockquote>
              <p>{feedback.strengths[0]}</p>
              <p className="muted">{feedback.gaps[0]}</p>
              {session.mode === "mock" && (
                <p className="notice">
                  Fixture feedback and fixed placeholder scores; this is not an evaluation of your
                  ability.
                </p>
              )}
            </section>
          )}
        </div>
        <aside className="stack">
          <MonitoringPanel
            required={!fixture}
            onReadinessChange={setMediaReady}
            ref={monitoringRef}
            sessionId={sessionId}
            consent={session.config.monitoring}
            events={session.events}
            onEvents={onEvents}
            onConsentChange={onConsentChange}
            playbackActive={ttsPlaying}
            active={
              session.status === "in_progress" &&
              !(pending && session.answers.length + 1 >= session.config.questionCount)
            }
          />
          <section className="panel">
            <h2>A useful answer has a path</h2>
            <ol className="plain-list">
              <li>State your assumptions.</li>
              <li>Explain the sequence.</li>
              <li>Discuss one failure case.</li>
              <li>Describe a verification step.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
