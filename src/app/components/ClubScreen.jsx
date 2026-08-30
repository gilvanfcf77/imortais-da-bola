'use client';

import { useEffect, useState } from 'react';
import { listClubs } from '../actions.js';

export default function ClubScreen({ onSelect }) {
  const [clubs, setClubs] = useState(null);

  useEffect(() => {
    listClubs().then(setClubs);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4">
      <h2 className="text-2xl font-bold">Escolha seu clube</h2>
      {clubs === null ? (
        <p className="text-slate-400">Carregando clubes...</p>
      ) : (
        <div className="grid w-full gap-3">
          {clubs.map((club) => (
            <button
              key={club.slug}
              onClick={() => onSelect(club)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-4 text-left text-lg font-medium transition hover:border-emerald-500 hover:bg-slate-800"
            >
              {club.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
