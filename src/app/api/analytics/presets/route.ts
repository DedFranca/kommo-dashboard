import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import {
  createAnalyticsPreset,
  deleteAnalyticsPreset,
  getAnalyticsPresets,
  setActiveAnalyticsPreset,
  updateAnalyticsPreset,
} from "@/services/analytics-presets.service";
import type { DashboardLayoutState } from "@/types/dashboard-layout";

export async function GET() {
  const session = await getRequestSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const collection = await getAnalyticsPresets(session.userId);
  return NextResponse.json(collection);
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: { name?: string; description?: string; layout?: DashboardLayoutState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Informe um nome para o layout" }, { status: 400 });
  }

  const collection = await createAnalyticsPreset(access.session.userId, {
    name: body.name,
    description: body.description,
    layout: body.layout,
  });
  return NextResponse.json(collection, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  let body: {
    presetId?: string;
    action?: "setActive" | "update";
    name?: string;
    description?: string;
    layout?: DashboardLayoutState;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.presetId) {
    return NextResponse.json({ error: "presetId é obrigatório" }, { status: 400 });
  }

  try {
    if (body.action === "setActive") {
      const collection = await setActiveAnalyticsPreset(access.session.userId, body.presetId);
      return NextResponse.json(collection);
    }

    const collection = await updateAnalyticsPreset(access.session.userId, body.presetId, {
      name: body.name,
      description: body.description,
      layout: body.layout,
    });
    return NextResponse.json(collection);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar layout";
    console.error("[analytics/presets] PATCH failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  const { searchParams } = new URL(req.url);
  const presetId = searchParams.get("id");
  if (!presetId) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  const collection = await deleteAnalyticsPreset(access.session.userId, presetId);
  return NextResponse.json(collection);
}
