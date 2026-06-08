import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./ThemeProvider";
import { ToastProvider } from "./components/Toast";

export const metadata: Metadata = {
  title: "Fab — Equipment & Kitchenware Store",
  description: "Equipment management and online kitchenware store for Fab",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
