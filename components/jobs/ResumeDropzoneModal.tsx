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
  MapPin,
  Globe,
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
    // Dynamic skill extraction from resume text
    const extractedSkills = new Set(profile.skills);
    const keywords = [
      "Django",
      "FastAPI",
      "Python",
      "Celery",
      "Redis",
      "Postgres",
      "PostgreSQL",
      "Qdrant",
      "RAG",
      "Docker",
      "ROS2",
      "GraphQL",
      "RabbitMQ",
      "Prometheus",
      "Kubernetes",
      "TypeScript",
      "React",
    ];

    keywords.forEach((kw) => {
      if (text.toLowerCase().includes(kw.toLowerCase())) {
        extractedSkills.add(kw);
      }
    });

    setProfile((prev) => ({
      ...prev,
      resumeText: text,
      skills: Array.from(extractedSkills),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || "";
      handleTextChange(text);
      setProfile((prev) => ({
        ...prev,
        fileName: file.name,
      }));
    };
    reader.readAsText(file);
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hair pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-md">
                <FileText size={22} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-espresso leading-tight">
                  Candidate Resume & Location Profile
                </h2>
                <p className="font-mono text-xs text-coffee">
                  Upload your updated resume & set target City, State, and Remote preferences for real-time web scans.
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

          {/* Location Selector Row */}
          <div className="space-y-2 font-mono text-xs border-b border-hair pb-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 uppercase">
              <MapPin size={15} />
              <span>Target Search Location & Remote Preference</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-coffee uppercase font-bold block mb-1">Target City</label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) =>
                    setProfile({ ...profile, city: e.target.value, location: `${e.target.value}, ${profile.state}` })
                  }
                  placeholder="e.g. Ahmedabad, Bengaluru"
                  className="w-full rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] px-3 py-2 text-xs font-mono text-espresso placeholder-coffee focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-coffee uppercase font-bold block mb-1">Target State</label>
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) =>
                    setProfile({ ...profile, state: e.target.value, location: `${profile.city}, ${e.target.value}` })
                  }
                  placeholder="e.g. Gujarat, Karnataka"
                  className="w-full rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] px-3 py-2 text-xs font-mono text-espresso placeholder-coffee focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] cursor-pointer hover:border-amber-500/40">
                  <input
                    type="checkbox"
                    checked={profile.isRemote}
                    onChange={(e) => setProfile({ ...profile, isRemote: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <Globe size={16} className="text-amber-500" />
                  <span className="font-bold text-espresso text-[11px]">Include Remote Opportunities</span>
                </label>
              </div>
            </div>
          </div>

          {/* Resume Drag-and-Drop File Upload Box */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-espresso uppercase flex items-center gap-1.5">
                <Upload size={14} className="text-amber-500" />
                <span>Upload Updated Resume File / Paste CV Text</span>
              </label>
              {profile.fileName && (
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  File: {profile.fileName}
                </span>
              )}
            </div>

            {/* File Input Box */}
            <div className="relative rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-center hover:bg-amber-500/10 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={24} className="mx-auto text-amber-500 mb-1" />
              <div className="font-bold text-espresso text-xs">
                Click or Drop Updated Resume File (.pdf, .txt, .md)
              </div>
              <div className="text-[10px] text-coffee mt-0.5">
                Auto-extracts skill keywords and updates live job search queries.
              </div>
            </div>

            {/* Resume Text Textarea */}
            <textarea
              value={profile.resumeText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste candidate resume text or CV summary here..."
              rows={4}
              className="w-full rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] p-3 text-xs font-mono text-espresso placeholder-coffee focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Extracted Skill Tags */}
          <div className="space-y-2 font-mono text-xs">
            <label className="text-[11px] font-bold text-coffee uppercase flex items-center gap-1">
              <Tag size={13} className="text-amber-500" />
              <span>Extracted Skill Vector ({profile.skills.length} Skills)</span>
            </label>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar p-2 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-500"
                >
                  <span>{skill}</span>
                  <button onClick={() => handleRemoveSkill(skill)} className="hover:text-espresso">
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
              <span>{saved ? "Match Profile Saved!" : "Save Profile & Update Live Web Scan"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
