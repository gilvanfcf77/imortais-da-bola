export default function HomeScreen({ onStart }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">Imortais da Bola</h1>
      <button
        onClick={onStart}
        className="rounded-lg bg-emerald-500 px-8 py-3 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Iniciar Copa
      </button>
    </div>
  );
}
