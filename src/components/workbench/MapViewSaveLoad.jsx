import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

/**
 * Serialize / deserialize helpers
 */
function serializeState({ colorMode, colorOverrides, hiddenValues, filters }) {
  return {
    color_mode: colorMode,
    color_overrides: JSON.stringify(colorOverrides || {}),
    hidden_values: JSON.stringify([...(hiddenValues || [])]),
    filter_search: filters.search || "",
    filter_city: filters.city || "",
    filter_shelter_type: filters.shelter_type || "",
    filter_asset_status: filters.asset_status || "",
    filter_assignment_status: filters.assignment_status || "",
    filter_assignment_type: filters.assignment_type || "",
    filter_priority_bucket: filters.priority_bucket || "",
    filter_team_name: filters.team_name || "",
    filter_has_incident: !!filters.has_incident,
    filter_has_work_order: !!filters.has_work_order,
    filter_show_unassigned_only: !!filters.show_unassigned_only,
    filter_is_ordered: !!filters.is_ordered,
    filter_is_implementation_phase: !!filters.is_implementation_phase,
  };
}

function deserializeState(view) {
  let colorOverrides = {};
  let hiddenValues = new Set();
  try { colorOverrides = JSON.parse(view.color_overrides || "{}"); } catch {}
  try { hiddenValues = new Set(JSON.parse(view.hidden_values || "[]")); } catch {}
  return {
    colorMode: view.color_mode || "default",
    colorOverrides,
    hiddenValues,
    filters: {
      search: view.filter_search || "",
      city: view.filter_city || "",
      shelter_type: view.filter_shelter_type || "",
      asset_status: view.filter_asset_status || "",
      assignment_status: view.filter_assignment_status || "",
      assignment_type: view.filter_assignment_type || "",
      priority_bucket: view.filter_priority_bucket || "",
      team_name: view.filter_team_name || "",
      has_incident: !!view.filter_has_incident,
      has_work_order: !!view.filter_has_work_order,
      show_unassigned_only: !!view.filter_show_unassigned_only,
      is_ordered: !!view.filter_is_ordered,
      is_implementation_phase: !!view.filter_is_implementation_phase,
    },
  };
}

export default function MapViewSaveLoad({ colorMode, colorOverrides, hiddenValues, filters, onLoad }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingName, setSavingName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["mapViews"],
    queryFn: () => base44.entities.MapViews.list("-created_date"),
  });

  const saveMutation = useMutation({
    mutationFn: async (name) => {
      const user = await base44.auth.me();
      const payload = {
        name,
        view_type: "Custom",
        is_shared: true,
        created_by_user: user?.email,
        ...serializeState({ colorMode, colorOverrides, hiddenValues, filters }),
      };
      return base44.entities.MapViews.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapViews"] });
      toast({ title: "View saved!" });
      setSavingName("");
      setShowSaveInput(false);
      setDropdownOpen(false);
    },
    onError: () => toast({ title: "Failed to save view", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MapViews.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mapViews"] }),
  });

  const handleLoad = (view) => {
    onLoad(deserializeState(view));
    setDropdownOpen(false);
    toast({ title: `View "${view.name}" loaded` });
  };

  const handleSave = () => {
    if (!savingName.trim()) return;
    saveMutation.mutate(savingName.trim());
  };

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shrink-0"
          title="Save / Load map view"
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Views</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 z-50">
        {/* Save section */}
        <div className="px-2 py-1.5">
          {showSaveInput ? (
            <div className="flex gap-1">
              <input
                autoFocus
                type="text"
                placeholder="View name..."
                value={savingName}
                onChange={e => setSavingName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowSaveInput(false); }}
                className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !savingName.trim()}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1.5 w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium py-0.5"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              Save current view...
            </button>
          )}
        </div>

        {views.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Saved Views</div>
            {isLoading && (
              <div className="px-2 py-2 flex justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              </div>
            )}
            {views.map(v => (
              <div key={v.id} className="flex items-center group px-1">
                <DropdownMenuItem
                  className="flex-1 cursor-pointer text-xs py-1.5"
                  onSelect={() => handleLoad(v)}
                >
                  <Bookmark className="h-3 w-3 mr-1.5 text-slate-400 shrink-0" />
                  <span className="truncate">{v.name}</span>
                </DropdownMenuItem>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(v.id); }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity"
                  title="Delete view"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </>
        )}

        {!isLoading && views.length === 0 && (
          <div className="px-2 py-2 text-[11px] text-slate-400 text-center">No saved views yet</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}