import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const LIST_TYPES = [
  "Asset Category", "Asset Type", "Asset Status",
  "Child Category", "Child Type",
  "Incident Status", "Incident Priority", "Incident Category"
];

export default function Configuration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState("Asset Category");
  const [newValue, setNewValue] = useState("");

  const { data: allItems = [] } = useQuery({ queryKey: ["configLists"], queryFn: () => base44.entities.ConfigLists.list() });

  const items = allItems.filter(i => i.list_type === selectedType).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ConfigLists.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configLists"] });
      setNewValue("");
      toast({ title: "Item added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfigLists.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configLists"] });
      toast({ title: "Item removed" });
    },
  });

  const handleAdd = () => {
    if (!newValue.trim()) return;
    createMutation.mutate({ list_type: selectedType, value: newValue.trim(), is_active: true, sort_order: items.length });
  };

  return (
    <div>
      <TopHeader title="Configuration" />
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Manage Dropdown Lists</h2>
          <p className="text-xs text-slate-500 mb-6">Configure the dropdown values used across the application. These lists power category, type, status, and priority fields.</p>

          <div className="flex items-center gap-4 mb-6">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 mb-4">
            {items.length === 0 && <p className="text-sm text-slate-400 py-4">No items configured. Add values below.</p>}
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700">{item.value}</span>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={`Add new ${selectedType} value...`} className="max-w-sm" onKeyDown={e => e.key === "Enter" && handleAdd()} />
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleAdd}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}