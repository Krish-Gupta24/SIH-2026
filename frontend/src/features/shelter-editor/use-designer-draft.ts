"use client";

import { useState, useEffect, useCallback } from "react";
import { ShelterFormValues, ShelterFormReturn, defaultShelterFormValues } from "./schema";

const DRAFT_STORAGE_KEY = "shelter_designer_draft_v1";
const ADVANCED_MODE_KEY = "shelter_designer_advanced_mode";

export function useDesignerDraft(form: ShelterFormReturn) {
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Load advanced mode preference
  useEffect(() => {
    try {
      const storedAdv = localStorage.getItem(ADVANCED_MODE_KEY);
      if (storedAdv !== null) {
        setAdvancedMode(storedAdv === "true");
      }
    } catch {
      // Ignore localStorage read errors in SSR/sandboxed mode
    }
  }, []);

  const toggleAdvancedMode = useCallback(() => {
    setAdvancedMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ADVANCED_MODE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Save current form values to localStorage
  const saveDraft = useCallback(() => {
    try {
      const currentValues = form.getValues();
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(currentValues));
      const nowStr = new Date().toLocaleTimeString();
      setLastSaved(nowStr);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
      return true;
    } catch (err) {
      console.error("Failed to save draft to localStorage:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return false;
    }
  }, [form]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        alert("No saved draft found in local storage.");
        return false;
      }
      const parsed = JSON.parse(raw);
      form.reset(parsed);
      const nowStr = new Date().toLocaleTimeString();
      setLastSaved(nowStr);
      return true;
    } catch (err) {
      console.error("Failed to load draft:", err);
      alert("Failed to load saved draft: invalid JSON format.");
      return false;
    }
  }, [form]);

  // Export current values as downloaded JSON file
  const exportJson = useCallback(() => {
    try {
      const currentValues = form.getValues();
      const filename = `shelter_${currentValues.project.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_draft.json`;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentValues, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to export JSON:", err);
      alert("Failed to export draft to JSON file.");
    }
  }, [form]);

  // Import JSON from user file upload
  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        form.reset(parsed);
        alert("Shelter configuration imported successfully!");
      } catch (err) {
        console.error("Import parse error:", err);
        alert("Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  }, [form]);

  // Reset form to canonical defaults
  const resetToDefaults = useCallback(() => {
    if (confirm("Reset all wizard values to the canonical baseline Ladakh shelter? Any unsaved edits will be lost.")) {
      form.reset(defaultShelterFormValues);
    }
  }, [form]);

  return {
    advancedMode,
    toggleAdvancedMode,
    lastSaved,
    saveStatus,
    saveDraft,
    loadDraft,
    exportJson,
    importJson,
    resetToDefaults,
  };
}
