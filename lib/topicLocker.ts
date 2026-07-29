"use client";

import { useMentorStore } from "@/lib/mentorStore";
import { usePlanner } from "@/lib/store";

export interface LockTopicInput {
  id: string;
  title: string;
  sprintDay?: number;
  description?: string;
}

/**
  Single-click helper that locks a topic into AI Senior Mentor,
  switches the view to "mentor", and automatically starts the Socratic drill!
 */
export function lockTopicAndOpenMentor(topic: LockTopicInput) {
  const mentorStore = useMentorStore.getState();
  const plannerStore = usePlanner.getState();

  // 1. Set active topic & context in mentorStore
  mentorStore.setActiveTopic(topic.id, {
    id: topic.id,
    title: topic.title,
    sprintDay: topic.sprintDay ?? 1,
    description: topic.description,
  });

  // 2. Switch view to "mentor"
  plannerStore.setActiveView("mentor");

  // 3. Dispatch starter prompt event for MentorView
  const prompt = `Mentor, let's drill on "${topic.title}". Lock this topic and guide me step-by-step through first principles, internal working, and L6 interview questions.`;

  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("lock-topic-and-start", {
        detail: { topicTitle: topic.title, prompt },
      })
    );
  }, 150);
}
