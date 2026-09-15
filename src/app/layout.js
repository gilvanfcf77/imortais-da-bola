import './globals.css';

export const metadata = {
  title: 'Imortais da Bola',
  description: 'Projeto de fã, sem afiliação oficial com clubes ou jogadores citados.',
};

// Without this, mobile browsers render the page at a fixed desktop-width
// viewport (~980px) and zoom out to fit it, so every `sm:`/`md:` Tailwind
// breakpoint never actually engages on a phone — the browser thinks it has
// desktop-sized space available regardless of the real screen size.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
