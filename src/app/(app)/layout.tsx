import { GraduationCap, LogOut } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import NavLinks from "./NavLinks";
import BottomNav from "./BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-sm print:hidden dark:border-zinc-800 dark:bg-zinc-950/80">
        <nav className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-2.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold sm:hidden">
            <GraduationCap className="h-4 w-4 text-teal-600" />
            Class Tracker
          </span>
          <NavLinks />
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-8 pb-24 sm:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
