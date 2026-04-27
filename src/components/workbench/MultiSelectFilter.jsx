import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

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

  const allSelected = selected.length === options.length && options.length > 0;

  const handleSelectAll = () => {
    onChange(allSelected ? [] : options);
  };

  const displayText = selected.length === 0 
    ? placeholder
    : allSelected
    ? "All"
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition(prev => ({
          ...prev,
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        }));
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="w-full h-7 px-2 py-1 text-xs border border-input rounded-md bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && createPortal(
        <div 
          className="fixed bg-white border border-input rounded-md shadow-lg z-[9999]"
          style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            width: `${position.width}px`
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Prevent the MapFilterBar click-outside handler from firing
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          data-multiselectfilter="true"
        >
          <div className="p-2 border-b border-slate-100">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 px-1"
            />
          </div>

          <label className="flex items-center gap-2 px-2 py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-3 h-3 shrink-0"
            />
            <span className="text-xs text-slate-700 font-medium">Select all</span>
          </label>

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
        </div>,
        document.body
      )}
    </div>
  );
}