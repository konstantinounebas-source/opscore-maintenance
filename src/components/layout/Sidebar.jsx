import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Box, AlertTriangle, Settings, 
  ChevronLeft, ChevronRight, Wrench, Package, MapPin,
  Users, ShieldCheck, FileText, BarChart2
} from "lucide-react";

const navItems = [
  { path: "/Assets", label: "Assets", icon: Box, submenu: [
    { path: "/Childs", label: "Child Assets", icon: Package }
  ]},
  { path: "/Incidents", label: "Incidents", icon: AlertTriangle },
  { path: "/WorkOrders", label: "Work Orders", icon: Wrench },
  { path: "/Planning", label: "Planning Workbench", icon: MapPin },
  { path: "/Forms", label: "Forms", icon: FileText },
  { path: "/Configuration", label: "Configuration", icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();

  return (
    <aside className={`fixed left-0 top-0 h-full bg-slate-900 text-white z-30 transition-all duration-300 flex flex-col ${collapsed ? "w-16" : "w-60"}`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-700/50">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-wide truncate">Maintenance Tool</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center mx-auto">
            <Wrench className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          const submenu = item.submenu || [];
          return (
            <div key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
              {!collapsed && submenu.length > 0 && (
                <div className="ml-4 space-y-1 mt-1">
                  {submenu.map((subitem) => {
                    const isSubActive = location.pathname === subitem.path;
                    const SubIcon = subitem.icon;
                    return (
                      <Link
                        key={subitem.path}
                        to={subitem.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isSubActive
                            ? "bg-indigo-500/30 text-indigo-200"
                            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                        }`}
                      >
                        <SubIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{subitem.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-slate-700/50 text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}