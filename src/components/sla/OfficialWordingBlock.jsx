/**
 * OfficialWordingBlock — #12 & #13
 * Displays the official contractual wording template for CR+OMPI and FMPI forms.
 * Used as a collapsible reference panel in both forms.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";

const WORDING = {
  cr_ompi: {
    title: "Επίσημο Κείμενο — Επιβεβαίωση Παραλαβής + OMPI",
    titleEn: "Official Wording — Confirmation of Receipt + OMPI",
    contractRef: "Άρθρο 14, Παράγραφος 3 – Διαχείριση Συμβάντων",
    contractRefEn: "Article 14, Paragraph 3 – Incident Management",
    sections: [
      {
        label: "Επιβεβαίωση Παραλαβής (Confirmation of Receipt – CR)",
        content: [
          "Ο Ανάδοχος επιβεβαιώνει τη λήψη της αναφοράς συμβάντος εντός των συμβατικών προθεσμιών:",
          "• P2 (Υψηλή Προτεραιότητα): Επιβεβαίωση εντός της ίδιας εργάσιμης ημέρας (ή έως τις 09:00 της επόμενης εάν η αναφορά ελήφθη μετά τις 17:00)",
          "• P1 (Χαμηλή Προτεραιότητα): Επιβεβαίωση εντός 24 ωρών από τη λήψη της αναφοράς",
          "Η επιβεβαίωση αποτελεί τυπική αποδοχή της αναφοράς και εκκινεί τον μετρητή SLA για τα επόμενα στάδια."
        ]
      },
      {
        label: "Σχέδιο Διαχείρισης Περιστατικού (OMPI – Outline Management Plan of Incident)",
        content: [
          "Ο Ανάδοχος υποβάλλει το Αρχικό Σχέδιο Διαχείρισης Περιστατικού (OMPI) ταυτόχρονα με την Επιβεβαίωση Παραλαβής.",
          "Το OMPI περιλαμβάνει:",
          "• Αρχική εκτίμηση βλάβης και επηρεαζόμενων υποσυστημάτων",
          "• Καθορισμό κατάστασης εγγύησης (Εντός / Εκτός Εγγύησης – OWR)",
          "• Αξιολόγηση ανάγκης άμεσης ασφάλισης (Make Safe) για P2 περιστατικά",
          "• Αξιολόγηση ανάγκης επιθεώρησης",
          "• Αρχικό χρονοδιάγραμμα αποκατάστασης",
          "Για OWR περιστατικά: Απαιτείται υποβολή FMPI εντός 7 ημερολογιακών ημερών από την ημερομηνία Επιβεβαίωσης Παραλαβής."
        ]
      }
    ]
  },
  fmpi: {
    title: "Επίσημο Κείμενο — Πλήρες Σχέδιο Διαχείρισης Περιστατικού (FMPI)",
    titleEn: "Official Wording — Full Management Plan of Incident (FMPI)",
    contractRef: "Άρθρο 14, Παράγραφος 5 – Πλήρες Σχέδιο Αποκατάστασης",
    contractRefEn: "Article 14, Paragraph 5 – Full Restoration Plan",
    sections: [
      {
        label: "Πλήρες Σχέδιο Διαχείρισης Περιστατικού (FMPI – Full Management Plan of Incident)",
        content: [
          "Ο Ανάδοχος υποβάλλει πλήρες Σχέδιο Διαχείρισης Περιστατικού (FMPI) εντός των ακόλουθων προθεσμιών:",
          "• Εκτός Εγγύησης (OWR): Εντός 7 ημερολογιακών ημερών από την Επιβεβαίωση Παραλαβής",
          "• Εντός Εγγύησης: Μόνο εάν ζητηθεί ειδικά από την Αναθέτουσα Αρχή",
          "Το FMPI περιλαμβάνει:",
          "• Λεπτομερή περιγραφή βλάβης και αιτίας",
          "• Πλήρη ανάλυση εργασιών και υλικών αποκατάστασης",
          "• Κοστολόγηση βάσει Συμβολαίου (Pricing Order)",
          "• Φωτογραφικό υλικό πριν και μετά την αποκατάσταση",
          "• Χρονοδιάγραμμα ολοκλήρωσης εργασιών"
        ]
      },
      {
        label: "Έγκριση Αναθέτουσας Αρχής (CA Approval) — Μόνο για OWR",
        content: [
          "Για περιστατικά Εκτός Εγγύησης (OWR), το FMPI υποβάλλεται στην Αναθέτουσα Αρχή (ΑΑ) για έγκριση πριν την έναρξη διορθωτικών εργασιών.",
          "Μετά την έγκριση CA:",
          "• Ο Ανάδοχος εκκινεί τις διορθωτικές εργασίες",
          "• Προθεσμία αποκατάστασης: 21 ημερολογιακές ημέρες από την ημερομηνία έγκρισης CA",
          "Σε περίπτωση απόρριψης CA: Ο Ανάδοχος αναθεωρεί και επανυποβάλλει το FMPI."
        ]
      },
      {
        label: "Pricing Order — Ανάλυση Κόστους Εργασιών",
        content: [
          "Η Ανάλυση Κόστους (Pricing Order) συνοδεύει υποχρεωτικά το FMPI για OWR περιστατικά.",
          "Περιλαμβάνει:",
          "• Περιγραφή εργασιών βάσει τιμολογίου συμβολαίου",
          "• Ποσότητες και τιμές μονάδας χωρίς ΦΠΑ",
          "• Συνολικό κόστος εργασιών",
          "• Επιβεβαίωση και υπογραφή εκπροσώπου Αναθέτουσας Αρχής"
        ]
      }
    ]
  }
};

export default function OfficialWordingBlock({ formType = "cr_ompi", defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedSections, setExpandedSections] = useState({});
  const wording = WORDING[formType];
  if (!wording) return null;

  const toggleSection = (idx) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <ScrollText className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700">{wording.title}</p>
          <p className="text-xs text-slate-400">{wording.titleEn}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded hidden sm:block">
            {wording.contractRef}
          </span>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          }
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100">
          {wording.sections.map((section, idx) => (
            <div key={idx} className="bg-white">
              <button
                type="button"
                onClick={() => toggleSection(idx)}
                className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                {expandedSections[idx]
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                }
                <p className="text-xs font-semibold text-slate-700">{section.label}</p>
              </button>
              {expandedSections[idx] && (
                <div className="px-6 pb-4 space-y-1.5">
                  {section.content.map((line, li) => (
                    <p key={li} className={`text-xs leading-relaxed ${line.startsWith("•") ? "text-slate-600 pl-2" : "text-slate-700 font-medium"}`}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}