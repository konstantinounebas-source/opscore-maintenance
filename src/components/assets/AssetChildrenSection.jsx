import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lock, Trash2 } from "lucide-react";

const STATUSES = ["Planned", "Installed", "Not Installed", "Removed"];

function addMonths(dateStr, months) {
  if (!dateStr || !months) return "";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function computeWarrantyDates(child, catalogEntry, assetDeliveryDate) {
  const rule = catalogEntry?.warranty_start_rule || "asset_delivery_date";
  let start = "";
  if (rule === "asset_delivery_date") start = assetDeliveryDate || "";
  else if (rule === "child_installation_date") start = child.installation_date || "";
  // manual → leave blank
  const end = start ? addMonths(start, catalogEntry?.default_warranty_months) : "";
  return { warranty_start_date: start, warranty_end_date: end };
}

export default function AssetChildrenSection({ shelterType, deliveryDate, onChange, existingChildren = [] }) {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["childCatalog"],
    queryFn: () => base44.entities.ChildCatalog.list(),
  });
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["typeTemplates"],
    queryFn: () => base44.entities.TypeTemplates.list(),
  });

  const isLoading = catalogLoading || templatesLoading;

  // Load template when shelter type changes (only on new asset creation)
  useEffect(() => {
    if (!shelterType || isLoading || existingChildren.length > 0) return;

    const typeTemplates = templates
      .filter(t => t.shelter_type_code === shelterType && t.active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const newRows = typeTemplates.map(tpl => {
      const catalogEntry = catalog.find(c => c.id === tpl.child_catalog_id);
      if (!catalogEntry || !catalogEntry.active) return null;
      return {
        _key: tpl.id,
        child_catalog_id: tpl.child_catalog_id,
        included: tpl.default_included !== false,
        mandatory: tpl.mandatory === true,
        child_name_snapshot: catalogEntry.child_name,
        child_category_snapshot: catalogEntry.child_category || "",
        child_type_snapshot: catalogEntry.child_type || "",
        catalogEntry,
        serial_number: "",
        installation_date: "",
        status: "Planned",
        warranty_start_date: "",
        warranty_end_date: "",
      };
    }).filter(Boolean);

    setRows(newRows);
    setLoaded(true);
  }, [shelterType, isLoading, templates.length, catalog.length]);

  // Load existing children when editing
  useEffect(() => {
    if (existingChildren.length === 0 || isLoading) return;
    const mapped = existingChildren.map((ch, i) => {
      const catalogEntry = catalog.find(c => c.id === ch.child_catalog_id);
      return {
        _key: ch.id || `existing-${i}`,
        existingId: ch.id,
        child_catalog_id: ch.child_catalog_id,
        included: true,
        mandatory: ch.mandatory || false,
        child_name_snapshot: ch.child_name_snapshot || catalogEntry?.child_name || "",
        child_category_snapshot: ch.child_category_snapshot || catalogEntry?.child_category || "",
        child_type_snapshot: ch.child_type_snapshot || catalogEntry?.child_type || "",
        catalogEntry,
        serial_number: ch.serial_number || "",
        installation_date: ch.installation_date || "",
        status: ch.status || "Planned",
        warranty_start_date: ch.warranty_start_date || "",
        warranty_end_date: ch.warranty_end_date || "",
      };
    });
    setRows(mapped);
    setLoaded(true);
  }, [existingChildren.length, isLoading]);

  // Recompute warranty dates when delivery date changes
  useEffect(() => {
    if (!loaded) return;
    setRows(prev => prev.map(row => {
      if (!row.catalogEntry) return row;
      if (row.catalogEntry.warranty_start_rule !== "asset_delivery_date") return row;
      const { warranty_start_date, warranty_end_date } = computeWarrantyDates(row, row.catalogEntry, deliveryDate);
      return { ...row, warranty_start_date, warranty_end_date };
    }));
  }, [deliveryDate, loaded]);

  // Notify parent of changes
  useEffect(() => {
    if (!loaded) return;
    const output = rows
      .filter(r => r.included)
      .map(r => {
        const { warranty_start_date, warranty_end_date } = computeWarrantyDates(r, r.catalogEntry, deliveryDate);
        return {
          child_catalog_id: r.child_catalog_id,
          child_name_snapshot: r.child_name_snapshot,
          child_category_snapshot: r.child_category_snapshot,
          child_type_snapshot: r.child_type_snapshot,
          serial_number: r.serial_number,
          installation_date: r.installation_date,
          status: r.status,
          mandatory: r.mandatory,
          warranty_start_date: r.catalogEntry?.warranty_start_rule === "manual" ? r.warranty_start_date : warranty_start_date,
          warranty_end_date: r.catalogEntry?.warranty_start_rule === "manual" ? r.warranty_end_date : warranty_end_date,
        };
      });
    onChange(output);
  }, [rows, loaded]);

  const updateRow = (key, changes) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...changes } : r));
  };

  const removeRow = (key) => {
    setRows(prev => prev.filter(r => r._key !== key));
  };

  if (!shelterType) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading child components...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-2 italic">
        No child template defined for shelter type "{shelterType}". Configure in Settings → Child Logic.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{rows.filter(r => r.included).length} of {rows.length} components included</p>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-2 py-2 text-left w-8">✓</th>
              <th className="px-2 py-2 text-left">Child Name</th>
              <th className="px-2 py-2 text-left">Category</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-left w-24">Serial No.</th>
              <th className="px-2 py-2 text-left w-28">Install Date</th>
              <th className="px-2 py-2 text-left w-24">Status</th>
              <th className="px-2 py-2 text-left w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row._key} className={`${!row.included ? "opacity-40" : "hover:bg-slate-50"}`}>
                <td className="px-2 py-1.5">
                  {row.mandatory ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" title="Mandatory" />
                  ) : (
                    <input type="checkbox" checked={row.included} onChange={e => updateRow(row._key, { included: e.target.checked })} className="cursor-pointer" />
                  )}
                </td>
                <td className="px-2 py-1.5 font-medium text-slate-800">
                  {row.child_name_snapshot}
                  {row.mandatory && <Badge className="ml-1 text-[10px] h-4 bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Required</Badge>}
                </td>
                <td className="px-2 py-1.5 text-slate-500">{row.child_category_snapshot}</td>
                <td className="px-2 py-1.5 text-slate-500">{row.child_type_snapshot}</td>
                <td className="px-2 py-1.5">
                  <Input className="h-6 text-xs px-1.5" value={row.serial_number} onChange={e => updateRow(row._key, { serial_number: e.target.value })} placeholder="S/N" disabled={!row.included} />
                </td>
                <td className="px-2 py-1.5">
                  <Input type="date" className="h-6 text-xs px-1.5" value={row.installation_date}
                    onChange={e => updateRow(row._key, { installation_date: e.target.value })} disabled={!row.included} />
                </td>
                <td className="px-2 py-1.5">
                  <Select value={row.status} onValueChange={v => updateRow(row._key, { status: v })} disabled={!row.included}>
                    <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  {!row.mandatory && (
                    <button onClick={() => removeRow(row._key)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">Warranty dates are computed automatically on save. <Lock className="w-3 h-3 inline" /> = mandatory, cannot be removed.</p>
    </div>
  );
}