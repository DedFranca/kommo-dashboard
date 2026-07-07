export const LAYOUT_KINDS = ["DASHBOARD", "ANALYTICS"] as const;
export type LayoutKindValue = (typeof LAYOUT_KINDS)[number];

export function isLayoutKind(value: unknown): value is LayoutKindValue {
  return typeof value === "string" && LAYOUT_KINDS.includes(value as LayoutKindValue);
}

export type LayoutSummary = {
  id: string;
  name: string;
  description: string | null;
  kind: LayoutKindValue;
  dataSourceIntegrationId: string | null;
  ownerId: string;
  ownerName: string | null;
  sharedViewerIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type LayoutDetail = LayoutSummary & {
  config: unknown;
};
