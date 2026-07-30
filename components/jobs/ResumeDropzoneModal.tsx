"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Check,
  Sparkle,
  X,
  User,
  Lightning,
  ShieldCheck,
  Code,
  Tag,
} from "@phosphor-icons/react";
import { CandidateProfile, DEFAULT_CANDIDATE_PROFILE } from "@/lib/jobs/resumeParser";

export function ResumeDropzoneModal({
  open,
  onClose,
  onSaveProfile,
}: {
  open: boolean;
  onClose: () => void;
  onSaveProfile: (profile: CandidateProfile) => void;
}) {
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_CANDIDATE_PROFILE);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);

  const handleTextChange = (text: string) => {
    // Simple dynamic skill extraction from text
    const extractedSkills = new Set(profile.skills);
    const keywords = ["Django", "FastAPI", "Python", "Celery", "Redis", "Postgres", "Qdrant", "RAG", "Docker", "ROS2", "GraphQL"];
    keywords.forEach((kw) => {
      if (text.toLowerCase().includes(kw.toLowerCase())) {
        extractedSkills.add(kw);
      }
    });

    setProfile({
      ...profile,
      resumeText: text,
      skills: Array.from(extractedSkills),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()],
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skill),
    });
  };

  const handleSave = () => {
    onSaveProfile(profile);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hair pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-md">
                <FileText size={22} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-espresso leading-tight">
                  Candidate Resume & Match Profile Engine
                </h2>
                <p className="font-mono text-xs text-coffee">
                  Paste resume text to extract skill vectors & auto-calculate 0–100% job match scores.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Target Criteria Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
              <div className="text-[10px] uppercase font-bold text-coffee">Candidate</div>
              <div className="text-sm font-bold text-espresso mt-0.5 truncate">{profile.name}</div>
              <div className="text-[10px] text-coffee opacity-80 mt-0.5">{profile.yearsExperience} Yrs Exp</div>
            </div>

            <div className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
              <div className="text-[10px] uppercase font-bold text-coffee">Target Roles</div>
              <div className="text-sm font-bold text-amber-500 mt-0.5 truncate">AI Backend Engineer</div>
              <div className="text-[10px] text-coffee opacity-80 mt-0.5">Django · RAG · Systems</div>
            </div>

            <div className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
              <div className="text-[10px] uppercase font-bold text-coffee">Target Salary</div>
              <div className="text-sm font-bold text-emerald-500 mt-0.5 truncate">₹15–20 LPA / $55–70k</div>
              <div className="text-[10px] text-coffee opacity-80 mt-0.5">India / Global Remote</div>
            </div>
          </div>

          {/* Resume Text Input Dropzone */}
          <div className="space-y-2 font-mono text-xs">
            <label className="text-[11px] font-bold text-espresso uppercase flex items-center gap-1.5">
              <Upload size={14} className="text-amber-500" />
              <span>Paste Resume Text / CV Brief</span>
            </label>
            <textarea
              value={profile.resumeText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste candidate resume text or CV summary here..."
              rows={5}
              className="w-full rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] p-3 text-xs font-mono text-espresso placeholder-coffee focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Extracted Skill Tags */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-coffee uppercase flex items-center gap-1">
                <Tag size={13} className="text-amber-500" />
                <span>Extracted Skill Vector ({profile.skills.length} Skills)</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar p-2 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-500"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-espresso"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add Skill Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                placeholder="Add custom skill (e.g. Kubernetes, Golang)..."
                className="flex-1 rounded-lg border border-hair bg-cream-base dark:bg-[#12151E] px-3 py-1.5 text-xs font-mono text-espresso placeholder-coffee focus:outline-none"
              />
              <button
                onClick={handleAddSkill}
                className="rounded-lg bg-cream-deep border border-hair px-3 py-1.5 font-mono text-xs font-bold text-espresso hover:bg-coffee/10"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Footer Save */}
          <div className="flex justify-end gap-2 pt-2 border-t border-hair">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-mono text-xs font-bold text-black hover:bg-amber-400 shadow-md transition-all active:scale-95"
            >
              {saved ? <Check size={16} /> : <Sparkle size={16} weight="fill" />}
              <span>{saved ? "Match Profile Saved!" : "Save Profile & Update Job Match Scores"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
