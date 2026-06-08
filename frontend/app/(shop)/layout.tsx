import StoreProvider from "./store/StoreProvider";
import StoreHeader from "./store/StoreHeader";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-12">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-400">
            <p>© {new Date().getFullYear()} Fab Kitchenware. All rights reserved.</p>
            <p className="mt-1 text-xs">Pay on delivery · Quality guaranteed</p>
          </div>
        </footer>
      </div>
    </StoreProvider>
  );
}
