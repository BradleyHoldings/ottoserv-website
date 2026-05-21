"use client";

import { FormEvent, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const DialogComponent = dynamic(() =>
  import("@/components/ui/dialog").then((mod) => ({
    default: mod.Dialog,
  })), { ssr: false }
);

const DialogContent = dynamic(() =>
  import("@/components/ui/dialog").then((mod) => mod.DialogContent),
  { ssr: false }
);

const DialogHeader = dynamic(() =>
  import("@/components/ui/dialog").then((mod) => mod.DialogHeader),
  { ssr: false }
);

const DialogTitle = dynamic(() =>
  import("@/components/ui/dialog").then((mod) => mod.DialogTitle),
  { ssr: false }
);

const DialogDescription = dynamic(() =>
  import("@/components/ui/dialog").then((mod) => mod.DialogDescription),
  { ssr: false }
);

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CreateLeadModal({
  open,
  onOpenChange,
  onSubmit,
}: CreateLeadModalProps) {
  const [source, setSource] = useState("manual");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    formData.set("source", source);
    onSubmit(e);
  };

  // Always use fallback modal - simple div-based approach
  return (
    <>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
          }} onClick={() => onOpenChange(false)} />
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1a1a1a",
            zIndex: 51,
            maxWidth: "28rem",
            width: "calc(100% - 2rem)",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600", color: "white", marginBottom: "0.5rem" }}>Create New Lead</h2>
            <p style={{ fontSize: "0.875rem", color: "#999", marginBottom: "1rem" }}>Add a new lead to your pipeline. All fields are optional.</p>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#ccc", display: "block", marginBottom: "0.5rem" }}>Contact Name</label>
                <input name="contactName" placeholder="e.g. John Smith" style={{ width: "100%", padding: "0.5rem", backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "0.375rem", color: "white", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#ccc", display: "block", marginBottom: "0.5rem" }}>Company Name</label>
                <input name="companyName" placeholder="e.g. ABC Corp" style={{ width: "100%", padding: "0.5rem", backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "0.375rem", color: "white", boxSizing: "border-box" }} />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#ccc", display: "block", marginBottom: "0.5rem" }}>Phone</label>
                  <input name="phone" type="tel" placeholder="(555) 123-4567" style={{ width: "100%", padding: "0.5rem", backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "0.375rem", color: "white", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#ccc", display: "block", marginBottom: "0.5rem" }}>Email</label>
                  <input name="email" type="email" placeholder="john@example.com" style={{ width: "100%", padding: "0.5rem", backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "0.375rem", color: "white", boxSizing: "border-box" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#ccc", display: "block", marginBottom: "0.5rem" }}>Service Needed</label>
                <input name="serviceNeeded" placeholder="e.g. HVAC Installation" style={{ width: "100%", padding: "0.5rem", backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "0.375rem", color: "white", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "#ccc", display: "block", marginBottom: "0.5rem" }}>Follow-up Date</label>
                <input name="followUpDate" type="date" style={{ width: "100%", padding: "0.5rem", backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "0.375rem", color: "white", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => onOpenChange(false)} style={{ padding: "0.5rem 1rem", backgroundColor: "transparent", border: "1px solid #444", borderRadius: "0.375rem", color: "#ccc", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: "0.5rem 1rem", backgroundColor: "#3b82f6", border: "none", borderRadius: "0.375rem", color: "white", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500" }}>
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
