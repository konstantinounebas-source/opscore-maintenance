/**
 * Shared form default data schemas.
 * Both desktop and mobile forms import from here so they always stay in sync.
 * Add new fields here ONCE — they will appear in both desktop and mobile.
 */

// ── Corrective WO Checklist ───────────────────────────────────────────────────
export const correctiveDefaultData = {
  // Header
  date_of_work: "", completed_by: "", temperature: "", weather: "", photos_sent: "",
  foreman: "", technician1: "", technician2: "", technician3: "",
  work_from: "", work_to: "",

  // Quality checks
  hs_measures: "", work_completion: "", quality_check: "", deficiencies: "",

  // Checklist — Structural
  structural_na: false,
  structural_frame_check: false, structural_frame_status: "",
  structural_connections_check: false, structural_connections_status: "",
  structural_paint_check: false, structural_paint_status: "",
  structural_notes: "",

  // Checklist — Panels
  panels_na: false,
  panels_side_check: false, panels_side_status: "",
  panels_plastic_check: false, panels_plastic_status: "",
  panels_sealing_check: false, panels_sealing_status: "",
  panels_notes: "",

  // Checklist — Glass
  glass_na: false,
  glass_surface_check: false, glass_surface_status: "",
  glass_frames_check: false, glass_frames_status: "",
  glass_notes: "",

  // Checklist — Bench
  bench_na: false,
  bench_wood_check: false, bench_wood_status: "",
  bench_supports_check: false, bench_supports_status: "",
  bench_notes: "",

  // Checklist — Electrical Infrastructure
  elec_infra_na: false,
  elec_power_panel_check: false, elec_power_panel_status: "",
  elec_wiring_check: false, elec_wiring_status: "",
  elec_screen_check: false, elec_screen_status: "",
  elec_infra_notes: "",

  // Checklist — Solar
  solar_na: false,
  solar_panel_check: false, solar_panel_status: "",
  solar_indicator_check: false, solar_indicator_status: "",
  solar_notes: "",

  // Checklist — Energy Storage
  energy_na: false,
  energy_battery_check: false, energy_battery_status: "",
  energy_connections_check: false, energy_connections_status: "",
  energy_replacement_check: false, energy_replacement_status: "",
  energy_notes: "",

  // Checklist — Electrical Panel
  elec_panel_na: false,
  elec_router_check: false, elec_router_status: "",
  elec_controller_check: false, elec_controller_status: "",
  elec_power_check: false, elec_power_status: "",
  elec_panel_notes: "",

  // Checklist — Lighting
  lighting_na: false,
  lighting_roof_check: false, lighting_roof_status: "",
  lighting_sign_check: false, lighting_sign_status: "",
  lighting_notes: "",

  // Checklist — Software
  software_na: false,
  software_lighting_check: false, software_lighting_status: "",
  software_normal_check: false, software_normal_status: "",
  software_notes: "",

  // Checklist — Extra Equipment
  extra_equip_na: false,
  extra_malfunction_check: false, extra_malfunction_status: "",
  extra_bin_check: false, extra_bin_status: "",
  extra_signs_check: false, extra_signs_status: "",
  extra_equip_notes: "",

  // Checklist — Roof
  roof_na: false,
  roof_lightbox_check: false, roof_lightbox_status: "",
  roof_panels_check: false, roof_panels_status: "",
  roof_notes: "",

  // Vehicles
  veh_personnel: false, veh_materials: false, veh_truck: false, veh_crane: false,
  veh_grinder: false, veh_disc: false, veh_compressor: false, veh_other: false,
  veh_other_text: "",

  // Photos
  photo_inspection: false, photo_hs: false, photo_traffic: false,

  // Security
  sec_generator: false, sec_crusher: false, sec_truck: false, sec_crane: false,
  security_notes: "",

  // Notes
  general_notes: "",
  specific_work_1: "", specific_work_2: "", specific_work_3: "",
  specific_work_4: "", specific_work_5: "", specific_work_6: "",
  specific_work_7: "", specific_work_8: "", specific_work_9: "",
  specific_work_10: "", specific_work_11: "", specific_work_12: "",
  incomplete_reason: "", additional_works: "",

  // Closure
  close_wo_yes: false, close_wo_no: false, close_wo_reason: "",

  work_order_ref: "",

  // Files (used by mobile)
  photos: [],
  signature: "",
};

// ── Make-Safe Checklist ───────────────────────────────────────────────────────
export const makeSafeDefaultData = () => ({
  // A. ΣΤΟΙΧΕΙΑ
  date: "", time_start: "", technician: "", vehicle: "", time_arrival: "", time_end: "",

  // B. STOP & ASSESS
  check_360: false,
  danger_electrical: false, danger_glass: false, danger_structural: false, danger_pv: false,
  danger_other: false, danger_other_text: "",
  immediate_danger: "",
  danger_description: "",

  // C. PPE & ΕΞΟΠΛΙΣΜΟΣ
  ppe_vest: false, ppe_helmet: false, ppe_gloves: false, ppe_glasses: false,
  ppe_shoes: false, ppe_mask: false, ppe_extinguisher: false, ppe_all: false,
  eq_cones: false, eq_loto_kit: false, eq_all: false, eq_other: false, eq_other_text: "",

  // D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ
  tmp1: false, tmp2: false, tmp3: false, tmp4: false,
  tmr1: false, tmr2: false, tmr3: false, tmbs1: false, tmbs2: false,
  coord_police: false, coord_municipality: false, coord_other: false, coord_other_text: "",

  // E. LOTO
  loto_ac: false, loto_pv: false, loto_battery: false, loto_other: false, loto_other_text: "",
  loto_isolation: false,
  loto_lock_tag: false, loto_lock_tag_name: "",
  loto_confirm: false,
  loto_notes: "",

  // F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE
  f1_cover: false, f1_panel_lock: false,
  f2_collect: false, f2_stabilize: false, f2_cover: false,
  f3_stabilize: false, f3_remove: false,
  f4_isolate: false, f4_thermal: "", f4_evacuate: false, f4_full_removal: false,
  f5_other: "",

  // G. ΕΙΔΙΚΟ ΟΧΗΜΑ
  vehicle_none: false, vehicle_yes: false,
  veh_cherry: false, veh_crane: false, veh_other: false, veh_other_text: "",
  veh_justification: "",

  // H. Εκκρεμότητες
  pending_corrective: "",

  // I. ΤΕΚΜΗΡΙΩΣΗ
  doc_photo_before: false, doc_photo_after: false, doc_wm: false,
  doc_materials: false, doc_materials_text: "",
  doc_make_safe_completed: false,
  doc_hd_comments: "",
  photos_before: [], photos_after: [],

  // K. ΥΠΟΓΡΑΦΕΣ
  sig_tech: "", sig_tech_upload: null,
  sig_hd: "", sig_hd_upload: null,
  sig_date: "",

  // Files (used by mobile)
  photos: [],
  signature: "",
});

// ── Inspection WO Checklist ───────────────────────────────────────────────────
export const inspectionDefaultData = {
  date_of_work: "", completed_by: "", workorder_no: "", aa_stegastrou: "", typos_stegastrou: "",

  // Πεζοδρόμιο
  pez_plakes_pez: "", pez_topothetes_plakes: "", pez_skyrodeema: "", pez_kraspedo_pez: "",
  pez_plakes_tyflon: "", pez_plakes_tyflon_check: "", pez_alles_plakes: "", pez_geiosi: "",
  pez_apokatastasi: "",

  // Κύρια Κατασκευή
  kat_stegaztro_oriz: "", kat_vides: "", kat_kena: "", kat_kathariothta: "",

  // Πυλώνας Πόρτας
  pil_domiki: "", pil_stiriksi: "", pil_steganopoi: "", pil_menteseedes: "", pil_kleidaria: "", pil_vafi: "",

  // Κατασκευή Πόρτας
  porta_domiki: "", porta_stiriksi: "", porta_steganopoi: "", porta_menteseedes: "", porta_kleidaria: "", porta_vafi: "",

  // Σήμανση Πορτών
  siman_domiki: "", siman_stiriksi: "", siman_steganopoi: "", siman_menteseedes: "", siman_kleidaria: "", siman_vafi: "",

  // Οροφή
  orofi_domiki: "", orofi_kalimmata: "", orofi_steganopoi: "", orofi_pv: "", orofi_vafi: "",

  // Παγκάκι
  pagk_domiki: "", pagk_verniki: "", pagk_pleuriko: "", pagk_vafi: "",

  // Light Box
  lb_domiki: "", lb_acryliki: "", lb_kleidaria: "", lb_menteseedes: "", lb_vafi: "",

  // Περιμετρικά Πάνελ
  per_domiki: "", per_vafi: "",

  // Λοιπά
  auto_topothesi: "", glazz_topothesi: "",
  kados_egkat: "", vasipod_egkat: "",
  oriz_topothesi: "", oriz_typos: "",

  // Κατάσταση Περιστατικού
  anoigei_incident_nai: false, anoigei_incident_ochi: false,
  amesi_apokatastasi_nai: false, amesi_apokatastasi_ochi: false,
  ekkremes_civil: false, ekkremes_hlektrologos: false,
  kleisimo_nai: false, kleisimo_ochi: false,
  photo_prin: false, photo_meta: false,
  eggyhsh_nai: false, eggyhsh_ochi: false,

  sxolia: "",
  ergazies_pou_ektelesan: "",
  epalitheusi_onoma: "", epalitheusi_imerominia: "",

  // Files (used by mobile)
  photos: [],
  signature: "",
};