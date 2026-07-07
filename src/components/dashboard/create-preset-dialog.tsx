"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardLayoutState } from "@/types/dashboard-layout";
import type { LayoutPreset } from "@/types/dashboard-presets";

type Props = {
  isOpen: boolean;
  currentLayout: DashboardLayoutState;
  onClose: () => void;
  onSave: (preset: LayoutPreset) => Promise<void>;
  loading?: boolean;
};

export function CreatePresetDialog({
  isOpen,
  currentLayout,
  onClose,
  onSave,
  loading = false,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const preset: LayoutPreset = {
        id: `preset-custom-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || undefined,
        layout: currentLayout,
        isDefault: false,
      };
      await onSave(preset);
      setName("");
      setDescription("");
      onClose();
    } finally {
      setSaving(false);
    }
  }, [name, description, currentLayout, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-slate-950">
        <h2 className="mb-4 text-lg font-semibold">Criar novo layout</h2>
        <p className="mb-4 -mt-2 text-sm text-slate-500">
          Cria um layout em branco. Você adiciona os widgets que quiser e salva.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome do layout *
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Meu layout customizado"
              autoFocus
              disabled={saving || loading}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste layout..."
              disabled={saving || loading}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:bg-slate-900"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving || loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving || loading}
            className="flex-1"
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
