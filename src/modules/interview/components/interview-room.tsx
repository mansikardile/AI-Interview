"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { InterviewSession, MonitoringEvent, SubmitAnswerInput } from "@/contracts";
import { fixtureAnswers, fixtureSession } from "@/fixtures/interview";
import { api } from "@/lib/api-client";
import { MockIntelligence } from "@/modules/intelligence";
import { MonitoringPanel } from "@/modules/monitoring";

export function InterviewExperience({
  sessionId,
  fixture = false,
}: {
  sessionId: string;
  fixture?: boolean;
}) {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(
    fixture ? structuredClone(fixtureSession) : null,
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [telemetryError, setTelemetryError] = useState("");
  const submission = useRef<SubmitAnswerInput | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (fixture) return;
    let mounted = true;
    api
      .getSession(sessionId)
      .then((value) => {
        if (!mounted) return;
        setSession(value);
        if (value.status === "completed") router.replace(`/reports/${value.id}`);
      })
      .catch((error) => {
        if (mounted)
          setError(error instanceof Error ? error.message : "Could not load this interview.");
      });
    return () => {
      mounted = false;
    };
  }, [sessionId, fixture, router]);

  const onEvents = useCallback(
    (events: MonitoringEvent[]) => {
      setSession((current) =>
        current ? { ...current, events: [...current.events, ...events] } : current,
      );
      if (!fixture)
        void api
          .addEvents(sessionId, events)
          .catch(() =>
            setTelemetryError("An observation could not be saved. You can continue answering."),
          );
    },
    [sessionId, fixture],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.activeQuestionId || submitting.current || !draft.trim()) return;
    submitting.current = true;
    setPending(true);
    setError("");
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
      setSession(next);
      setDraft("");
      submission.current = null;
      if (!fixture && next.status === "completed") router.push(`/reports/${sessionId}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not submit. Your answer is preserved; try again.",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (!session)
    return (
      <main className="container">
        <section className="panel">
          <h1>{error ? "Interview unavailable" : "Opening your interview…"}</h1>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Link href="/">Back to setup</Link>
        </section>
      </main>
    );
  const question = session.questions.find((item) => item.id === session.activeQuestionId);
  const feedback = session.answers.at(-1)?.feedback;

  return (
    <main className="container">
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
          <section className="panel stack">
            {question ? (
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
                  <div className="row">
                    <button className="button" disabled={pending || !draft.trim()}>
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
                  </div>
                  <p className="small muted">
                    Voice and editable transcription controls will be implemented by A + C. Text
                    entry is always available.
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
            {error && (
              <p role="alert" className="error">
                {error}
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
            consent={session.config.monitoring}
            events={session.events}
            onEvents={onEvents}
            active={session.status === "in_progress"}
          />
          {telemetryError && (
            <p role="status" className="notice">
              {telemetryError}
            </p>
          )}
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
