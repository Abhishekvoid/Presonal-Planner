"use client";

export function LandingExperience({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center">
      <button
        type="button"
        onClick={onEnter}
        className="border border-coffee/40 px-6 py-3 text-espresso"
      >
        Open the Almanac (stub)
      </button>
    </main>
  );
}
