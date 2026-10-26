"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { answerQuickQuestion, type QuickAnswer } from "@/lib/guidance";

export function QuickAnswers({ handoff = "scroll" }: { handoff?: "scroll" | "link" }) {
  const [answers, setAnswers] = useState<QuickAnswer[]>([]);
  const [usable, setUsable] = useState(50);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/help")
      .then((response) => response.json())
      .then((json: { quickAnswers?: QuickAnswer[]; coachUsable?: number }) => {
        if (cancelled) return;
        setAnswers(json.quickAnswers ?? []);
        setUsable(json.coachUsable ?? 50);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function ask(question: string) {
    const next = answerQuickQuestion(question, answers, usable);
    setReply(next?.text ?? null);
  }

  return (
    <section className="rounded-2xl border border-white/10 p-4">
      <p className="text-sm font-semibold">Quick answers</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            className="min-h-10 rounded-full border border-white/15 px-3 text-left text-xs font-semibold text-white/80"
            onClick={() => ask(answer.chip)}
          >
            {answer.chip}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask a short question"
          aria-label="Ask a short question"
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-[#1E90FF]"
        />
        <button type="submit" className="h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-[#1E90FF]">
          Ask
        </button>
      </form>
      {reply ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-white/80">{reply}</p>
          {handoff === "scroll" ? (
            <a href="#quote-form" className="inline-flex text-sm font-semibold text-[#1E90FF]">
              Get my quote
            </a>
          ) : (
            <Link href="/quote" className="inline-flex text-sm font-semibold text-[#1E90FF]">
              Get my quote
            </Link>
          )}
        </div>
      ) : null}
    </section>
  );
}
