import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Users, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

const CREW_TYPES = ["Inspection", "Preventive", "Corrective", "Mixed"];
const CREW_STATUSES = ["Active", "Inactive", "On Leave", "Unavailable"];
const WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_CREW = {
  crew_code: "", crew_name: "", crew_type: "Mixed", status: "Active",
  base_city: "", capacity_per_day: "", capacity_per_week: "",
  working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  supervisor_name: "", notes: "", color_code: "#6366f1", is_active: true,
};

const DEFAULT_MEMBER = { crew_id: "", member_name: "", role: "", phone: "", email: "", status: "Active" };

function statusBadge(status) {
  const map = {
    Active: "bg-emerald-100 text-emerald-700",
    Inactive: "bg-slate-100 text-slate-500",
    "On Leave": "bg-amber-100 text-amber-700",
    Unavailable: "bg-red-100 text-red-500",
  };
  return map[status] || "bg-slate-100 text-slate-500";
}

function CrewFormDialog({ open, onOpenChange, initialData, onSave }) {
  const [form, setForm] = useState(initialData || DEFAULT_CREW);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDay = (day) => set("working_days", form.working_days?.includes(day)
    ? form.working_days.filter(d => d !== day)
    : [...(form.working_days || []), day]);

  const handleSave = async () => {
    if (!form.crew_code || !form.crew_name) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initialData?.id ? "Edit Crew" : "New Crew"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Crew Code *</Label><Input value={form.crew_code} onChange={e => set("crew_code", e.target.value)} className="h-8 text-sm" placeholder="CR-01" /></div>
            <div><Label className="text-xs">Crew Name *</Label><Input value={form.crew_name} onChange={e => set("crew_name", e.target.value)} className="h-8 text-sm" placeholder="Team Alpha" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Type</Label>
              <Select value={form.crew_type} onValueChange={v => set("crew_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CREW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CREW_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Base City</Label><Input value={form.base_city || ""} onChange={e => set("base_city", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Cap/Day</Label><Input type="number" value={form.capacity_per_day || ""} onChange={e => set("capacity_per_day", Number(e.target.value))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Cap/Week</Label><Input type="number" value={form.capacity_per_week || ""} onChange={e => set("capacity_per_week", Number(e.target.value))} className="h-8 text-sm" /></div>
          </div>
          <div><Label className="text-xs">Supervisor</Label><Input value={form.supervisor_name || ""} onChange={e => set("supervisor_name", e.target.value)} className="h-8 text-sm" /></div>
          <div>
            <Label className="text-xs">Working Days</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {WORKING_DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`px-2 py-0.5 rounded text-xs border transition-colors ${form.working_days?.includes(d) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Color</Label>
            <input type="color" value={form.color_code || "#6366f1"} onChange={e => set("color_code", e.target.value)} className="h-7 w-12 rounded border border-slate-200 cursor-pointer" />
          </div>
          <div><Label className="text-xs">Notes</Label><Input value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="h-8 text-sm" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.crew_code || !form.crew_name}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberFormDialog({ open, onOpenChange, crewId, initialData, onSave }) {
  const [form, setForm] = useState(initialData || { ...DEFAULT_MEMBER, crew_id: crewId });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.member_name) return;
    setSaving(true);
    await onSave({ ...form, crew_id: crewId });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{initialData?.id ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input value={form.member_name} onChange={e => set("member_name", e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Role</Label><Input value={form.role || ""} onChange={e => set("role", e.target.value)} className="h-8 text-sm" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div><Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{["Active", "Inactive"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.member_name}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Crews() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [crewDialogOpen, setCrewDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberCrewId, setMemberCrewId] = useState(null);
  const [expandedCrews, setExpandedCrews] = useState({});

  const { data: crews = [] }       = useQuery({ queryKey: ["crews"],              queryFn: () => base44.entities.Crews.list("-created_date") });
  const { data: members = [] }     = useQuery({ queryKey: ["crewMembers"],         queryFn: () => base44.entities.CrewMembers.list() });
  const { data: weeks = [] }       = useQuery({ queryKey: ["planningWeeks"],       queryFn: () => base44.entities.PlanningWeeks.list("-created_date") });
  const { data: allAssignments = [] } = useQuery({ queryKey: ["planningAssignments"], queryFn: () => base44.entities.PlanningAssignments.list() });

  // Workload is scoped to the active week (or most recent)
  const activeWeek = useMemo(() => weeks.find(w => w.is_active) || weeks[0] || null, [weeks]);
  const weekAssignments = useMemo(() =>
    activeWeek ? allAssignments.filter(a => a.planning_week_id === activeWeek.id) : [],
    [allAssignments, activeWeek]
  );

  const cities = useMemo(() => [...new Set(crews.map(c => c.base_city).filter(Boolean))], [crews]);

  const filteredCrews = useMemo(() => {
    return crews.filter(c =>
      (!filterType || c.crew_type === filterType) &&
      (!filterStatus || c.status === filterStatus) &&
      (!filterCity || c.base_city === filterCity)
    );
  }, [crews, filterType, filterStatus, filterCity]);

  const handleSaveCrew = async (form) => {
    if (editingCrew?.id) {
      await base44.entities.Crews.update(editingCrew.id, form);
      toast({ title: "Crew updated" });
    } else {
      await base44.entities.Crews.create(form);
      toast({ title: "Crew created" });
    }
    queryClient.invalidateQueries({ queryKey: ["crews"] });
    setEditingCrew(null);
  };

  const handleDeleteCrew = async (crew) => {
    await base44.entities.Crews.delete(crew.id);
    queryClient.invalidateQueries({ queryKey: ["crews"] });
    toast({ title: "Crew deleted" });
  };

  const handleSaveMember = async (form) => {
    if (editingMember?.id) {
      await base44.entities.CrewMembers.update(editingMember.id, form);
    } else {
      await base44.entities.CrewMembers.create(form);
    }
    queryClient.invalidateQueries({ queryKey: ["crewMembers"] });
    setEditingMember(null);
    toast({ title: "Member saved" });
  };

  const handleDeleteMember = async (member) => {
    await base44.entities.CrewMembers.delete(member.id);
    queryClient.invalidateQueries({ queryKey: ["crewMembers"] });
    toast({ title: "Member removed" });
  };

  const toggleExpand = (crewId) => setExpandedCrews(prev => ({ ...prev, [crewId]: !prev[crewId] }));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeader
        title="Crews"
        subtitle="Manage maintenance crews and members"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingCrew(null); setCrewDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Crew
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-3 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All types</SelectItem>
            {CREW_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All statuses</SelectItem>
            {CREW_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {cities.length > 0 && (
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-7 text-xs w-32"><SelectValue placeholder="All cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All cities</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filteredCrews.length} crew{filteredCrews.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filteredCrews.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">No crews yet. Create your first crew.</div>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filteredCrews.map(crew => {
              const crewMembers = members.filter(m => m.crew_id === crew.id);
              const weekTasks = weekAssignments.filter(a => a.crew_id === crew.id);
              const capacity = crew.capacity_per_week || 0;
              const overloaded = capacity > 0 && weekTasks.length > capacity;
              const expanded = expandedCrews[crew.id];

              return (
                <div key={crew.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  {/* Crew header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: crew.color_code || "#94a3b8" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{crew.crew_name}</span>
                        <span className="text-xs text-slate-400 font-mono">{crew.crew_code}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge(crew.status)}`}>{crew.status}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{crew.crew_type}</span>
                        {overloaded && <span className="text-xs flex items-center gap-0.5 text-orange-600"><AlertTriangle className="w-3 h-3" />Overloaded</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        {crew.base_city && <span>{crew.base_city}</span>}
                        {crew.supervisor_name && <span>Supervisor: {crew.supervisor_name}</span>}
                        <span>{crewMembers.length} member{crewMembers.length !== 1 ? "s" : ""}</span>
                        <span>{weekTasks.length} task{weekTasks.length !== 1 ? "s" : ""}{activeWeek ? ` (${activeWeek.week_code})` : ""}{capacity > 0 ? ` / ${capacity} cap` : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingCrew(crew); setCrewDialogOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-600" onClick={() => handleDeleteCrew(crew)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleExpand(crew.id)}>
                        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      </Button>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  {capacity > 0 && (
                    <div className="px-4 pb-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-0.5">
                        <span>Workload</span>
                        <span>{weekTasks.length} / {capacity}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${overloaded ? "bg-orange-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(100, capacity > 0 ? (weekTasks.length / capacity) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Members subtable */}
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Members</span>
                        <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
                          onClick={() => { setMemberCrewId(crew.id); setEditingMember(null); setMemberDialogOpen(true); }}>
                          <Plus className="w-3 h-3" /> Add Member
                        </Button>
                      </div>
                      {crewMembers.length === 0 ? (
                        <div className="text-xs text-slate-400 py-2 text-center">No members yet</div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-200">
                              <th className="text-left py-1 font-medium">Name</th>
                              <th className="text-left py-1 font-medium">Role</th>
                              <th className="text-left py-1 font-medium">Phone</th>
                              <th className="text-left py-1 font-medium">Status</th>
                              <th className="w-12"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {crewMembers.map(m => (
                              <tr key={m.id} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 font-medium text-slate-700">{m.member_name}</td>
                                <td className="py-1.5 text-slate-500">{m.role || "—"}</td>
                                <td className="py-1.5 text-slate-500">{m.phone || "—"}</td>
                                <td className="py-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${m.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{m.status}</span>
                                </td>
                                <td className="py-1.5">
                                  <div className="flex gap-1">
                                    <button onClick={() => { setMemberCrewId(crew.id); setEditingMember(m); setMemberDialogOpen(true); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-400"><Pencil className="w-3 h-3" /></button>
                                    <button onClick={() => handleDeleteMember(m)} className="p-0.5 hover:bg-red-100 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CrewFormDialog
        open={crewDialogOpen}
        onOpenChange={setCrewDialogOpen}
        initialData={editingCrew}
        onSave={handleSaveCrew}
      />
      <MemberFormDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        crewId={memberCrewId}
        initialData={editingMember}
        onSave={handleSaveMember}
      />
    </div>
  );
}