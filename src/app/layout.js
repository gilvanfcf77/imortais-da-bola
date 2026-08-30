import './globals.css';

export const metadata = {
  title: 'Imortais da Bola',
  description: 'Projeto de fã, sem afiliação oficial com clubes ou jogadores citados.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
