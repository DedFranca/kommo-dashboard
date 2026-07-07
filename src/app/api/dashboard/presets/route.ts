import { getRequestSession } from "@/lib/auth/request-session";
import { requireRequestEditAccess } from "@/lib/auth-guards";
import { getOrCreateDashboardForUser } from "@/services/dashboard.service";
import {
  deleteLayoutPreset,
  getLayoutPresetsForUser,
  saveLayoutPreset,
  setActiveLayoutPreset,
  updatePresetLayout,
} from "@/services/layout-presets.service";
import type { DashboardLayoutState } from "@/types/dashboard-layout";
import type { LayoutPreset } from "@/types/dashboard-presets";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dashboard = await getOrCreateDashboardForUser(session.userId);
    const presets = await getLayoutPresetsForUser(session.userId, dashboard.layout);
    return NextResponse.json(presets);
  } catch (error) {
    console.error("Error fetching layout presets:", error);
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getRequestSession();
  const access = requireRequestEditAccess(session);
  if (access instanceof NextResponse) return access;

  try {
    const body = (await req.json()) as {
      preset?: LayoutPreset;
      action?: string;
      presetId?: string;
      layout?: DashboardLayoutState;
    };

    if (body.action === "updateLayout" && body.presetId && body.layout) {
      const collection = await updatePresetLayout(access.session.userId, body.presetId, body.layout);
      return NextResponse.json(collection);
    }

    if (body.action === "setActive" && body.presetId) {
      const result = await setActiveLayoutPreset(access.session.userId, body.presetId);
      return NextResponse.json(result);
    }

    if (body.action === "delete" && body.presetId) {
      await deleteLayoutPreset(access.session.userId, body.presetId);
      return NextResponse.json({ success: true });
    }

    if (body.preset) {
      const saved = await saveLayoutPreset(access.session.userId, body.preset);
      return NextResponse.json(saved);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error managing layout presets:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
