import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DEFAULT_SLA_RULES } from "@/lib/slaEngine";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, ShieldCheck, Loader2, RefreshCw, Info } from "lucide-react";

const PHASE_LABELS = { CR_OMPI: "CR+OMPI", FMPI: "FMPI", Repair: "Επισκευή (Repair)" };
const PRIORITY_LABELS = { P1: "P1 – Χαμηλή (Low)", P2: "P2 – Υψηλή (High)", Any: "Οποιαδήποτε (Any)" };
const WARRANTY_LABELS = { "In Warranty": "Εντός Εγγύησης (In Warranty)", OWR: "Εκτός Εγγύησης (OWR)", Any: "Οποιαδήποτε (Any)" };
const UNIT_LABELS = { hours: "Ώρες (hours)", calendar_days: "Ημερολογιακές Ημέρες (calendar days)", business_days: "Εργάσιμες Ημέρες (business days)" };

const PHASE_COLORS = {
  CR_OMPI: "bg-indigo-100 text-indigo-700 border-indigo-200",
  FMPI: "bg-amber-100 text-amber-700 border-amber-200",
  Repair: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const DEFAULT_FORM = {
  code: "", name: "", phase: "CR_OMPI", priority: "Any", warranty_status: "Any",
  duration_value: "", duration_unit: "hours", warning_threshold_hours: 24,
  breach_threshold_hours: 0, is_active: true, notes: "",
};

function RuleDialog({ open, onOpenChange, initialData, onSave }) {
  const [form, setForm] = useState(initialData || DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.code || !form.name || !form.phase) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Επεξεργασία Κανόνα SLA" : "Νέος Κανόνας SLA"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Κωδικός Κανόνα (Code) *</Label>
              <Input value={form.code} onChange={e => set("code", e.target.value)} className="h-8 text-sm font-mono" placeholder="SLA_1_CR_OMPI_P1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Ονομασία (Name) *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} className="h-8 text-sm" placeholder="π.χ. Επιβεβαίωση Παραλαβής P1" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Φάση (Phase) *</Label>
              <Select value={form.phase} onValueChange={v => set("phase", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Προτεραιότητα</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Εγγύηση</Label>
              <Select value={form.warranty_status} onValueChange={v => set("warranty_status", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WARRANTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Διάρκεια (Duration) *</Label>
              <Input type="number" min="1" value={form.duration_value} onChange={e => set("duration_value", Number(e.target.value))} className="h-8 text-sm" placeholder="24" />
            </div>
            <div>
              <Label className="text-xs">Μονάδα (Unit)</Label>
              <Select value={form.duration_unit} onValueChange={v => set("duration_unit", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Προειδοποίηση (ώρες πριν)</Label>
              <Input type="number" min="0" value={form.warning_threshold_hours} onChange={e => set("warning_threshold_hours", Number(e.target.value))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Παράβαση (ώρες grace)</Label>
              <Input type="number" min="0" value={form.breach_threshold_hours} onChange={e => set("breach_threshold_hours", Number(e.target.value))} className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Σημειώσεις / Αναφορά Συμβολαίου</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="text-sm min-h-[60px]" placeholder="π.χ. Άρθρο 14 παρ. 3…" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active_dlg" checked={form.is_active !== false} onChange={e => set("is_active", e.target.checked)} />
            <Label htmlFor="is_active_dlg" className="text-xs cursor-pointer">Ενεργός (Active)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Άκυρο</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.code || !form.name}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Αποθήκευση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SLAConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [activePhase, setActivePhase] = useState("all");

  const { data: dbRules = [], isLoading } = useQuery({
    queryKey: ["slaRules"],
    queryFn: () => base44.entities.SLARules.list("-created_date"),
  });

  // Merge defaults with DB overrides — same logic as slaEngine.mergeRules
  const allRules = useMemo(() => {
    const map = {};
    for (const r of DEFAULT_SLA_RULES) map[r.code] = { ...r, _isDefault: true };
    for (const r of dbRules) {
      if (r.code) map[r.code] = { ...map[r.code], ...r, _isDefault: false };
    }
    return Object.values(map);
  }, [dbRules]);

  const filteredRules = useMemo(() =>
    activePhase === "all" ? allRules : allRules.filter(r => r.phase === activePhase),
    [allRules, activePhase]
  );

  const handleSave = async (form) => {
    if (editingRule?.id) {
      await base44.entities.SLARules.update(editingRule.id, form);
      toast({ title: "Κανόνας SLA ενημερώθηκε" });
    } else {
      await base44.entities.SLARules.create(form);
      toast({ title: "Κανόνας SLA δημιουργήθηκε" });
    }
    queryClient.invalidateQueries({ queryKey: ["slaRules"] });
    setEditingRule(null);
  };

  const handleDelete = async (rule) => {
    if (!rule.id) return; // can't delete default-only rules
    await base44.entities.SLARules.delete(rule.id);
    queryClient.invalidateQueries({ queryKey: ["slaRules"] });
    toast({ title: "Κανόνας διαγράφηκε" });
  };

  // Seed all defaults into DB
  const handleSeedDefaults = async () => {
    const existingCodes = new Set(dbRules.map(r => r.code).filter(Boolean));
    const toCreate = DEFAULT_SLA_RULES.filter(r => !existingCodes.has(r.code));
    if (toCreate.length === 0) {
      toast({ title: "Όλοι οι προεπιλεγμένοι κανόνες υπάρχουν ήδη" });
      return;
    }
    await Promise.all(toCreate.map(r => base44.entities.SLARules.create(r)));
    queryClient.invalidateQueries({ queryKey: ["slaRules"] });
    toast({ title: `${toCreate.length} προεπιλεγμένοι κανόνες φορτώθηκαν` });
  };

  const phases = ["all", "CR_OMPI", "FMPI", "Repair"];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeader
        title="Κανόνες SLA (SLA Rules)"
        subtitle="Διαχείριση συμβατικών προθεσμιών SLA ανά φάση, προτεραιότητα και κατάσταση εγγύησης"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleSeedDefaults}>
              <RefreshCw className="w-3.5 h-3.5" /> Φόρτωση Προεπιλογών
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> Νέος Κανόνας
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Πώς λειτουργεί: </span>
            Οι κανόνες στη βάση δεδομένων <strong>αντικαθιστούν</strong> τις αντίστοιχες προεπιλογές (βάσει κωδικού). Κανόνες που δεν υπάρχουν στη βάση χρησιμοποιούν αυτόματα τις συμβατικές προεπιλεγμένες τιμές.
            <span className="ml-1 text-blue-500">(Rules in DB override defaults by matching code. Unmatched defaults apply automatically.)</span>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-1.5">
          {phases.map(p => (
            <button
              key={p}
              onClick={() => setActivePhase(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activePhase === p
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {p === "all" ? "Όλα (All)" : PHASE_LABELS[p]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">Δεν βρέθηκαν κανόνες. Κάντε κλικ «Φόρτωση Προεπιλογών» για να ξεκινήσετε.</div>
          </div>
        ) : (
          <div className="max-w-5xl space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Κανόνας (Rule)</span>
              <span>Φάση</span>
              <span>Προτεραιότητα / Εγγύηση</span>
              <span>Διάρκεια</span>
              <span>Κατάσταση</span>
              <span></span>
            </div>

            {filteredRules.map((rule, idx) => (
              <div key={rule.code || idx}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-3 py-3 rounded-lg border text-sm transition-colors ${
                  rule._isDefault
                    ? "bg-slate-50/60 border-slate-200 hover:bg-slate-100/60"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{rule.name}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">{rule.code}</p>
                  {rule._isDefault && (
                    <span className="inline-block text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded mt-0.5">Προεπιλογή</span>
                  )}
                </div>

                <div>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${PHASE_COLORS[rule.phase] || "bg-slate-100 text-slate-500"}`}>
                    {PHASE_LABELS[rule.phase] || rule.phase}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${
                    rule.priority === "P2" ? "bg-red-50 text-red-600 border-red-200"
                    : rule.priority === "P1" ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>{PRIORITY_LABELS[rule.priority] || rule.priority}</span>
                  <br />
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${
                    rule.warranty_status === "OWR" ? "bg-amber-50 text-amber-600 border-amber-200"
                    : rule.warranty_status === "In Warranty" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>{WARRANTY_LABELS[rule.warranty_status] || rule.warranty_status}</span>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {rule.duration_value} <span className="text-xs font-normal text-slate-400">{UNIT_LABELS[rule.duration_unit] || rule.duration_unit}</span>
                  </p>
                  <p className="text-[10px] text-slate-400">⚠ {rule.warning_threshold_hours}h warning</p>
                </div>

                <div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${rule.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {rule.is_active !== false ? "Ενεργός" : "Ανενεργός"}
                  </span>
                </div>

                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                    setEditingRule(rule._isDefault ? { ...rule, id: null } : rule);
                    setDialogOpen(true);
                  }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  {!rule._isDefault && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleDelete(rule)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingRule}
        onSave={handleSave}
      />
    </div>
  );
}