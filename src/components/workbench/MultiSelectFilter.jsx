import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, ChevronDown } from "lucide-react";

export default function MultiSelectFilter({ 
  label, 
  options = [], 
  values = [],
  onChange,
  placeholder = "Select..."
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(() => 
    Array.isArray(values) ? values : (values ? [values] : []),
    [values]
  );

  const filteredOptions = useMemo(() =>
    options.filter(opt => 
      opt.toString().toLowerCase().includes(search.toLowerCase())
    ),
    [options, search]
  );

  const handleToggle = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(v => v !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    onChange(options);
  };

  const handleSelectNone = () => {
    onChange([]);
  };

  const displayText = selected.length === 0 
    ? placeholder
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-7 px-2 py-1 text-xs border border-input rounded-md bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-lg z-[9999] max-w-xs" style={{ zIndex: 9999 }}>
          <div className="p-2 border-b border-slate-100">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 px-1"
            />
          </div>

          <div className="flex gap-1 p-2 border-b border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] flex-1"
              onClick={handleSelectAll}
            >
              All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] flex-1"
              onClick={handleSelectNone}
            >
              None
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto p-1 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-xs text-slate-400 text-center">No results</div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => handleToggle(option)}
                    className="w-3 h-3 shrink-0"
                  />
                  <span className="truncate text-slate-700">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}