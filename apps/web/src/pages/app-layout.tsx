import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, FolderKanban, LayoutDashboard, LayoutTemplate, LogOut, PlusCircle, Stethoscope } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { API_URL, api } from "../lib/api";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/projects/new", label: "New project", icon: PlusCircle },
  { to: "/troubleshoot", label: "Troubleshoot", icon: Stethoscope },
  { to: "/templates", label: "Templates", icon: LayoutTemplate }
];

export function AppLayout() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["session"], queryFn: api.getSession });
  const user = data?.user;
  const visibleNavItems = user?.role === "admin" ? [...navItems, { to: "/admin", label: "Admin", icon: LayoutDashboard }] : navItems;

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
            <FolderKanban size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">shippy-ops-ai</div>
            <div className="text-xs text-slate-500">VPS deployment copilot</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div>
            <p className="text-sm font-medium text-slate-950">Local MVP workspace</p>
            <p className="text-xs text-slate-500">Fast template generation, persisted in PostgreSQL</p>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-slate-950">{user.name ?? user.email}</div>
                  <div className="text-xs text-slate-500">{data?.demo ? "Demo session" : user.role}</div>
                </div>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={async () => {
                    await api.logout();
                    await queryClient.invalidateQueries({ queryKey: ["session"] });
                  }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <a className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white" href={`${API_URL}/auth/google`}>
                Sign in with Google
              </a>
            )}
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
