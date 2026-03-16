import React from "react";
import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TopHeader({ title, actions }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <button className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}