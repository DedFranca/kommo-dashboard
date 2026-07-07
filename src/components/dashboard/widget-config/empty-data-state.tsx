"use client";

type Props = {
  compact?: boolean;
  message?: string;
  onConnect?: () => void;
};

export function EmptyDataState({ compact, message, onConnect }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "h-32 rounded-lg border border-dashed border-border p-3" : "h-full min-h-[120px] p-6"
      }`}
    >
      <span className="mb-1 text-2xl">{compact ? "📊" : "📊"}</span>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {message ?? "Nenhuma fonte de dados conectada"}
      </p>
      {!compact ? (
        <p className="mt-1 text-[10px] text-slate-400">
          Conecte o Kommo CRM ou importe um CSV para exibir dados neste widget.
        </p>
      ) : null}
      {onConnect ? (
        <button
          type="button"
          onClick={onConnect}
          className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] text-white hover:bg-indigo-700"
        >
          Conectar fonte de dados
        </button>
      ) : null}
    </div>
  );
}
