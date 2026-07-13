import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const totalTracksCount = await prisma.track.count();
    
    // If database is completely unseeded, indicate to client to upload its local state
    if (totalTracksCount === 0) {
      return NextResponse.json({ empty: true, message: "Database is empty." });
    }

    const tracks = await prisma.track.findMany({ orderBy: { order: "asc" } });
    const tasks = await prisma.task.findMany({ orderBy: { order: "asc" } });
    const days = await prisma.day.findMany({ orderBy: { order: "asc" } });
    const sessions = await prisma.focusSession.findMany({ orderBy: { date: "desc" } });
    const reflections = await prisma.reflection.findMany({ orderBy: { date: "desc" } });
    const companies = await prisma.company.findMany({
      include: { contacts: true },
      orderBy: { order: "asc" },
    });
    const templates = await prisma.template.findMany({ orderBy: { order: "asc" } });
    const notes = await prisma.note.findMany({ orderBy: { updatedAt: "desc" } });
    const kvRows = await prisma.kv.findMany();
    const config = await prisma.appConfig.findFirst();

    const focusSettings = config ? JSON.parse(config.focusSettings) : null;
    const activeTimer = config?.activeTimer ? JSON.parse(config.activeTimer) : null;
    const kv = Object.fromEntries(kvRows.map((r: { key: string; value: string }) => [r.key, r.value]));

    return NextResponse.json({
      empty: false,
      tracks,
      tasks,
      days,
      sessions,
      reflections,
      companies,
      templates,
      notes,
      kv,
      focusSettings,
      activeTimer,
    });
  } catch (err: any) {
    console.error("GET /api/sync failed:", err);
    return NextResponse.json({ error: err.message || "Failed to load database state." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      tracks = [],
      tasks = [],
      days = [],
      sessions = [],
      reflections = [],
      companies = [],
      templates = [],
      notes = [],
      kv = {},
      focusSettings = { workMin: 25, breakMin: 5 },
      activeTimer = null,
    } = payload;

    // Reconcile database state atomically using a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Clear existing study database records
      await tx.track.deleteMany({});
      await tx.day.deleteMany({});
      await tx.task.deleteMany({});
      await tx.focusSession.deleteMany({});
      await tx.reflection.deleteMany({});
      await tx.template.deleteMany({});
      await tx.contact.deleteMany({});
      await tx.company.deleteMany({});
      await tx.note.deleteMany({});
      await tx.kv.deleteMany({});
      await tx.appConfig.deleteMany({});

      // 2. Bulk insert study planner data
      if (tracks.length > 0) {
        await tx.track.createMany({ data: tracks });
      }
      if (days.length > 0) {
        // Whitelist Day columns so client-only fields never break createMany.
        const sanitisedDays = days.map((d: any) => ({
          id: d.id,
          index: d.index,
          date: d.date,
          title: d.title,
          goal: d.goal,
          must: d.must,
          result: d.result,
          notes: d.notes ?? null,
          revision: d.revision ?? null,
          order: d.order ?? 0,
        }));
        await tx.day.createMany({ data: sanitisedDays });
      }
      if (tasks.length > 0) {
        // Ensure difficulty is properly set as text, mapping default empty difficulty
        const sanitisedTasks = tasks.map((t: any) => ({
          ...t,
          difficulty: t.difficulty || "easy",
        }));
        await tx.task.createMany({ data: sanitisedTasks });
      }
      if (sessions.length > 0) {
        await tx.focusSession.createMany({ data: sessions });
      }
      if (reflections.length > 0) {
        await tx.reflection.createMany({ data: reflections });
      }
      if (templates.length > 0) {
        await tx.template.createMany({ data: templates });
      }
      if (notes.length > 0) {
        await tx.note.createMany({ data: notes });
      }

      // Persist the generic key/value bag (checklist toggles, gamification
      // counters, STAR stories, quiz score, cycle-start) that used to live in
      // raw localStorage.
      const kvEntries = Object.entries(kv as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string")
        .map(([key, value]) => ({ key, value: value as string }));
      if (kvEntries.length > 0) {
        await tx.kv.createMany({ data: kvEntries });
      }

      // 3. Insert companies and associated nested contacts
      for (const comp of companies) {
        const { contacts = [], ...compData } = comp;
        // Strip off custom contacts array before mapping to the raw Company table
        const sanitisedComp = {
          id: compData.id,
          name: compData.name,
          role: compData.role,
          stage: compData.stage,
          notes: compData.notes || "",
          contactName: compData.contactName || "",
          contactRole: compData.contactRole || "",
          channel: compData.channel || "linkedin",
          contactLink: compData.contactLink || "",
          draft: compData.draft || "",
          reachedOutAt: compData.reachedOutAt || null,
          followUpAt: compData.followUpAt || null,
          priority: compData.priority || "cold",
          source: compData.source || "",
          website: compData.website || null,
          jobUrl: compData.jobUrl || null,
          location: compData.location || null,
          salary: compData.salary || null,
          tags: compData.tags || [],
          closedReason: compData.closedReason || null,
          createdAt: compData.createdAt,
          order: compData.order || 0,
        };

        await tx.company.create({ data: sanitisedComp });

        if (contacts.length > 0) {
          const sanitisedContacts = contacts.map((c: any) => ({
            id: c.id,
            companyId: comp.id,
            name: c.name,
            role: c.role,
            channel: c.channel || "linkedin",
            link: c.link || "",
            draft: c.draft || "",
          }));
          await tx.contact.createMany({ data: sanitisedContacts });
        }
      }

      // 4. Save global timer settings
      await tx.appConfig.create({
        data: {
          id: "config",
          focusSettings: JSON.stringify(focusSettings),
          activeTimer: activeTimer ? JSON.stringify(activeTimer) : null,
        },
      });
    });

    return NextResponse.json({ success: true, message: "State synced successfully to Neon DB." });
  } catch (err: any) {
    console.error("POST /api/sync failed:", err);
    return NextResponse.json({ error: err.message || "Failed to sync state." }, { status: 500 });
  }
}
