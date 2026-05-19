import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./ThemeProvider";
import AuthProvider from "./components/AuthProvider";
import AuthGuard from "./components/AuthGuard";
import { ToastProvider } from "./components/Toast";

export const metadata: Metadata = {
  title: "Fab Entertainment — Equipment Management",
  description: "Real-time equipment check-out and check-in management for Fab Entertainment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AuthGuard>
                {children}
              </AuthGuard>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
