import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Gestorlocal | prospector",
  description:
    "Plataforma de presença digital, catálogo de serviços e geração de clientes para negócios locais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased w-full max-w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
