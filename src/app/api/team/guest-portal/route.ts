import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crewSession } from "@/lib/crew-guard";
import { freshCode, guestOffice, issueGroupCode, issuePass } from "@/lib/guest-portal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function allow(programId: string) {
  const session = await crewSession();
  if (!session || (session.kind !== "admin" && session.kind !== "client")) return null;
  if (session.kind === "client" && session.programId !== programId) return null;
  const program = await db.lightProgram.findUnique({ where: { id: programId } });
  if (!program) return null;
  if (session.kind === "client" && !program.clientManagesGroups) return null;
  return { session, program };
}

export async function GET(request: Request) {
  const programId = new URL(request.url).searchParams.get("programId") || "";
  const gate = await allow(programId);
  if (!gate) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json(await guestOffice(programId));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, string> | null;
  const programId = body?.programId || "";
  const gate = await allow(programId);
  if (!gate || !body) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const fresh = await run(gate.session.kind, programId, body);
  if (typeof fresh === "object" && fresh && "error" in fresh) return NextResponse.json(fresh, { status: 400 });
  return NextResponse.json({ ...(await guestOffice(programId)), fresh: typeof fresh === "string" ? fresh : "" });
}

async function run(kind: string, programId: string, body: Record<string, string>) {
  if (body.action === "toggle-client") {
    if (kind !== "admin") return { error: "Only the owner can change that." };
    await db.lightProgram.update({ where: { id: programId }, data: { clientManagesGroups: body.value === "yes" } });
    return "";
  }
  if (body.action === "save-group") {
    const name = body.name.trim();
    if (name.length < 2) return { error: "Enter a group name." };
    if (body.id) await db.lightGroup.update({ where: { id: body.id }, data: { name } });
    else await db.lightGroup.create({ data: { programId, name, kind: "NAMED" } });
    return "";
  }
  if (body.action === "delete-group") {
    const group = await db.lightGroup.findUnique({ where: { id: body.id } });
    if (!group || group.kind === "EVERYONE" || group.programId !== programId) return { error: "That group stays." };
    await db.lightGroup.delete({ where: { id: group.id } });
    return "";
  }
  if (body.action === "set-group-code") {
    const group = await db.lightGroup.findUnique({ where: { id: body.id } });
    if (!group || group.programId !== programId || group.kind === "EVERYONE") return { error: "Choose a group." };
    return issueGroupCode(group.id, body.code?.trim() || freshCode(false));
  }
  if (body.action === "clear-group-code") {
    await db.lightGroup.update({ where: { id: body.id }, data: { codeHash: "", codeSeal: "" } });
    return "";
  }
  if (body.action === "set-members") {
    const ids = body.paxIds.split(",").map((id) => id.trim()).filter(Boolean);
    await db.lightGroupMember.deleteMany({ where: { groupId: body.groupId } });
    if (ids.length) await db.lightGroupMember.createMany({ data: ids.map((paxId) => ({ groupId: body.groupId, paxId })) });
    return "";
  }
  if (body.action === "save-item") {
    const data = {
      title: body.title.trim() || "Move",
      kind: body.kind || "EVENT",
      timeLabel: body.timeLabel || "",
      sortKey: body.sortKey || body.timeLabel || "99",
      summary: body.summary || "",
      detail: body.detail || "",
      spot: body.spot || "",
      route: body.route || "",
      frequency: body.frequency || "",
      flightCode: body.flightCode || "",
      paxId: body.paxId || "",
    };
    const item = body.id
      ? await db.lightScheduleItem.update({ where: { id: body.id }, data })
      : await db.lightScheduleItem.create({ data: { ...data, programId } });
    const groupIds = body.groupIds.split(",").map((id) => id.trim()).filter(Boolean);
    await db.lightItemGroup.deleteMany({ where: { itemId: item.id } });
    if (groupIds.length) await db.lightItemGroup.createMany({ data: groupIds.map((groupId) => ({ itemId: item.id, groupId })) });
    return "";
  }
  if (body.action === "delete-item") {
    await db.lightScheduleItem.delete({ where: { id: body.id } });
    return "";
  }
  if (body.action === "issue-pass") return issuePass(body.paxId);
  if (body.action === "clear-pass") {
    await db.lightPax.update({ where: { id: body.paxId }, data: { passHash: "", passDate: "", passSeal: "" } });
    return "";
  }
  return { error: "Choose an action." };
}
