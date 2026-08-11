import Link from "next/link";
import { rulesIntro, rulesSections } from "@/lib/rules-content";

export const metadata = {
  title: "Rules — Cambio",
  description: "Full rules for playing Cambio online.",
};

export default function RulesPage() {
  return (
    <div className="flex flex-1 flex-col px-4 sm:px-6 py-[max(2rem,env(safe-area-inset-top,0px))] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-3 text-center">
          <Link
            href="/"
            className="inline-flex font-display text-[10px] text-accent hover:text-accent-soft transition-colors"
          >
            ← Back to home
          </Link>
          <h1 className="font-display text-2xl sm:text-4xl title-glow">
            How to Play Cambio
          </h1>
          <p className="text-sm text-theme-muted normal-case tracking-normal">
            {rulesIntro}
          </p>
        </header>

        <div className="space-y-4">
          {rulesSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="pixel-border bg-surface-elevated p-4 sm:p-5 text-left space-y-3"
            >
              <h2 className="font-display text-sm sm:text-base text-accent">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm text-theme leading-relaxed normal-case tracking-normal"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-theme normal-case tracking-normal">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
