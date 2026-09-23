"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ShelterFormValues, ShelterFormReturn, defaultShelterFormValues } from "./schema";

const DRAFT_STORAGE_KEY = "shelter_designer_draft_v1";
const ADVANCED_MODE_KEY = "shelter_designer_advanced_mode";

interface UseDesignerDraftOptions {
  activeProjectId?: string;
  autoSaveIntervalSec?: number;
  onAutosave?: (values: ShelterFormValues) => void;
}

export function useDesignerDraft(
  form: ShelterFormReturn,
  options?: UseDesignerDraftOptions
) {
  const { activeProjectId, autoSaveIntervalSec = 30, onAutosave } = options || {};

  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedJsonRef = useRef<string>("");

  // Stable references for event listeners and unmount flush
  const formRef = useRef(form);
  formRef.current = form;

  const onAutosaveRef = useRef(onAutosave);
  onAutosaveRef.current = onAutosave;

  const activeProjectIdRef = useRef(activeProjectId);
  activeProjectIdRef.current = activeProjectId;

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

  // Synchronous flush: immediately commits current form state to localStorage and store
  const flushNow = useCallback(() => {
    try {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const currentValues = formRef.current.getValues();
      if (!currentValues || !currentValues.project) return false;

      const json = JSON.stringify(currentValues);
      localStorage.setItem(DRAFT_STORAGE_KEY, json);
      if (activeProjectIdRef.current) {
        localStorage.setItem(`${DRAFT_STORAGE_KEY}_${activeProjectIdRef.current}`, json);
      }
      lastSavedJsonRef.current = json;

      if (onAutosaveRef.current) {
        onAutosaveRef.current(currentValues);
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSaved(nowStr);
      setSaveStatus("saved");
      return true;
    } catch (err) {
      console.warn("Autosave flush note:", err);
      return false;
    }
  }, []);

  // Save current form values to localStorage and trigger external persistence
  const saveDraft = useCallback(() => {
    try {
      const success = flushNow();
      if (success) {
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
      return success;
    } catch (err) {
      console.error("Failed to save draft:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return false;
    }
  }, [flushNow]);

  // Continuous automatic debounced autosave on every form modification (300ms debounce)
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!values || !values.project) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSaveStatus("saving");

      debounceTimerRef.current = setTimeout(() => {
        try {
          const currentValues = formRef.current.getValues();
          const json = JSON.stringify(currentValues);
          if (json === lastSavedJsonRef.current) {
            setSaveStatus("idle");
            return;
          }

          localStorage.setItem(DRAFT_STORAGE_KEY, json);
          if (activeProjectIdRef.current) {
            localStorage.setItem(`${DRAFT_STORAGE_KEY}_${activeProjectIdRef.current}`, json);
          }
          lastSavedJsonRef.current = json;

          if (onAutosaveRef.current) {
            onAutosaveRef.current(currentValues);
          }

          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setLastSaved(nowStr);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (e) {
          console.warn("Continuous autosave note:", e);
          setSaveStatus("idle");
        }
      }, 350); // 350ms debounce for responsive autosave
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [form]);

  // Periodic recurring background autosave (based on settings.autoSaveIntervalSec)
  useEffect(() => {
    const intervalMs = Math.max(10, autoSaveIntervalSec) * 1000;
    const interval = setInterval(() => {
      saveDraft();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [saveDraft, autoSaveIntervalSec]);

  // Immediate synchronous flush on browser back (popstate), tab close (beforeunload), pagehide, and React unmount
  useEffect(() => {
    const handleImmediateFlush = () => {
      flushNow();
    };

    window.addEventListener("beforeunload", handleImmediateFlush);
    window.addEventListener("pagehide", handleImmediateFlush);
    window.addEventListener("popstate", handleImmediateFlush);

    return () => {
      window.removeEventListener("beforeunload", handleImmediateFlush);
      window.removeEventListener("pagehide", handleImmediateFlush);
      window.removeEventListener("popstate", handleImmediateFlush);
      // Synchronous flush when component unmounts (e.g. user navigated back or switched route)
      handleImmediateFlush();
    };
  }, [flushNow]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const key = activeProjectIdRef.current ? `${DRAFT_STORAGE_KEY}_${activeProjectIdRef.current}` : DRAFT_STORAGE_KEY;
      const raw = localStorage.getItem(key) || localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        alert("No saved draft found in local storage.");
        return false;
      }
      const parsed = JSON.parse(raw);
      formRef.current.reset(parsed);
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSaved(nowStr);
      // Immediately propagate loaded draft to project store
      if (onAutosaveRef.current) {
        onAutosaveRef.current(parsed);
      }
      return true;
    } catch (err) {
      console.error("Failed to load draft:", err);
      alert("Failed to load saved draft: invalid JSON format.");
      return false;
    }
  }, []);

  // Export current values as downloaded JSON file
  const exportJson = useCallback(() => {
    try {
      const currentValues = formRef.current.getValues();
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
  }, []);

  // Import JSON from user file upload
  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        formRef.current.reset(parsed);
        if (onAutosaveRef.current) {
          onAutosaveRef.current(parsed);
        }
        alert("Shelter configuration imported successfully!");
      } catch (err) {
        console.error("Import parse error:", err);
        alert("Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  }, []);

  // Reset form to canonical defaults
  const resetToDefaults = useCallback(() => {
    if (confirm("Reset all wizard values to the canonical baseline Ladakh shelter? Any unsaved edits will be lost.")) {
      formRef.current.reset(defaultShelterFormValues);
      if (onAutosaveRef.current) {
        onAutosaveRef.current(defaultShelterFormValues);
      }
    }
  }, []);

  return {
    advancedMode,
    toggleAdvancedMode,
    lastSaved,
    saveStatus,
    saveDraft,
    flushNow,
    loadDraft,
    exportJson,
    importJson,
    resetToDefaults,
  };
}
