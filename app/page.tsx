"use client";

import { useState, useRef, useEffect } from "react";

const C = {
  blue: "#1c5d99",
  blueDark: "#154a7a",
  blueSubtle: "rgba(28,93,153,0.08)",
  blueBorder: "rgba(28,93,153,0.22)",
  ember: "#e8871e",
  emberDark: "#c96f0f",
  emberSubtle: "rgba(232,135,30,0.10)",
  emberBorder: "rgba(232,135,30,0.35)",
  bg: "#f2f6fa",
  bubbleAi: "#eaf0f6",
  white: "#ffffff",
  text: "#182636",
  textMuted: "#647082",
  border: "#dbe4ee",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  red: "#dc2626",
};

const GREETING =
  "Hi — I'm the Havenbrook Restoration intake assistant, here 24/7. What's going on: water damage, fire or smoke damage, mold, or storm damage?";

const MAX_TEXTAREA_HEIGHT = 120;
const PHONE_NUMBER_DISPLAY = "(800) 555-0174";
const PHONE_NUMBER_TEL = "+18005550174";

const PHOTO_MARKER = /^\[Attached a photo: (.*)\]$/;
const SYSTEM_NOTE_MARKER = /^\[SYSTEM_NOTE: (.*)\]$/;

const SUMMARY_LABELS: Record<string, string> = {
  propertyAddress: "Property Address",
  propertyType: "Property Type",
  occupancyRole: "Owner/Tenant/Manager",
  yearBuiltEra: "Year Built",
  accessNotes: "Access Notes",
  waterSource: "Water Source",
  areasAffected: "Areas Affected",
  standingWater: "Standing Water",
  whenStarted: "When It Started",
  surfacesWet: "Surfaces Wet",
  mustyOrVisibleMold: "Musty Smell / Visible Mold",
  priorActionsTaken: "Actions Taken So Far",
  insuranceClaimFiled: "Insurance Claim Filed",
  insuranceCarrier: "Insurance Carrier",
  adjusterAppointment: "Adjuster Appointment",
  condoNotified: "Condo Management Notified",
  condoOtherUnitsAffected: "Other Units Affected",
  commercialBusinessType: "Business Type",
  commercialOpenOrClosed: "Open or Closed",
  commercialAuthorizer: "Authorizer",
  fireDeptCleared: "Fire Dept. Cleared Re-Entry",
  suspectedCause: "Suspected Cause",
  suppressionWater: "Suppression Water Present",
  openingsOrBoardUpNeeded: "Board-Up Needed",
  contentsAssessmentNeeded: "Contents Assessment Needed",
  fireInvestigatorInvolved: "Fire Investigator Involved",
  occupiedOrCanRelocate: "Occupied / Can Relocate",
  extentVsThreshold: "Extent (vs. ~10 sq ft)",
  location: "Location",
  hvacProximity: "Near HVAC",
  hvacRunning: "HVAC Running",
  knownWaterSource: "Known Water Source",
  sewageOrContaminated: "Sewage / Contaminated Water",
  remediationIntent: "Remediation Intent",
  occupantsDuringWork: "Occupants During Work",
  downedLines: "Downed Power Lines",
  structuralSafety: "Structural Safety",
  breachWaterIntrusion: "Water Intrusion (Breach)",
  damageTypes: "Damage Types",
  tarpingUrgency: "Tarping/Board-Up Urgency",
  treeOnStructure: "Tree on Structure",
};

function formatSummaryText(summary: Record<string, any>, urgencyTier: string, peril: string) {
  const lines: string[] = [];
  lines.push(`Peril: ${peril || "unclassified"}`);
  lines.push(`Urgency: ${urgencyTier || "unknown"}`);
  for (const key of Object.keys(SUMMARY_LABELS)) {
    const val = summary?.[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      lines.push(`${SUMMARY_LABELS[key]}: ${val}`);
    }
  }
  return lines.join("\n");
}

function leadTag(urgencyTier: string, peril: string) {
  const tierPrefix = urgencyTier === "emergency" ? "EMERGENCY" : urgencyTier === "urgent" ? "URGENT" : "LEAD";
  const perilLabel = (peril || "OTHER").toUpperCase();
  return `[${tierPrefix}-${perilLabel}]`;
}

function toApiMessage(m: { role: string; content: string }) {
  const photoMatch = m.role === "user" ? m.content.match(PHOTO_MARKER) : null;
  if (photoMatch) {
    return {
      role: "user",
      content: [
        { type: "image", source: { type: "url", url: photoMatch[1] } },
        {
          type: "text",
          text: "Here's the photo I attached. Take a close look at what's actually in it before responding.",
        },
      ],
    };
  }
  const noteMatch = m.role === "user" ? m.content.match(SYSTEM_NOTE_MARKER) : null;
  if (noteMatch) {
    return { role: "user", content: noteMatch[1] };
  }
  return { role: m.role, content: m.content };
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.49a1 1 0 011 1 11.36 11.36 0 00.57 3.58 1 1 0 01-.25 1.01l-2.2 2.2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
      <path d="M9 12.2l2 2 4-4.2" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 18px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#9aa7b5",
            animation: `typePulse 1.3s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

const PHONE_DIGITS_RE = /\d/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ContactForm({
  onSubmit,
  urgent,
  submitting,
  error,
}: {
  onSubmit: (data: any) => void;
  urgent: boolean;
  submitting: boolean;
  error: boolean;
}) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "", time: "As soon as possible" });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [honeypot, setHoneypot] = useState("");

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }));
  };

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!form.name.trim()) e.name = true;
    const phoneDigits = (form.phone.match(PHONE_DIGITS_RE) || []).length;
    if (!form.phone.trim() || phoneDigits < 10) e.phone = true;
    if (!form.address.trim()) e.address = true;
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (submitting) return;
    if (validate()) {
      onSubmit({ ...form, honeypot, submittedAt: new Date().toISOString() });
    }
  };

  const accent = urgent ? C.ember : C.blue;

  const inputStyle = (key: string) => ({
    width: "100%",
    padding: "11px 14px",
    borderRadius: 6,
    border: `1px solid ${errors[key] ? C.red : C.border}`,
    fontSize: 14,
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box" as const,
    background: C.white,
    color: C.text,
  });

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${accent}`, borderRadius: 10, padding: "22px 20px", marginTop: 6, animation: "fadeSlide 0.35s ease-out" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
        {urgent ? "Let's get this to our on-call team right now" : "Almost done — how should the team reach you?"}
      </p>
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, lineHeight: 1.4 }}>
        {urgent ? "This takes about 30 seconds. A few more questions after this help the crew arrive prepared." : "A member of our team will review your details and follow up."}
      </p>

      <input
        type="text"
        name="_gotcha"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Full Name</label>
        <input style={inputStyle("name")} placeholder="e.g. Jordan Reyes" value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Best Number to Reach You Right Now</label>
        <input style={inputStyle("phone")} placeholder="(416) 000-0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        {errors.phone && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Enter a valid phone number (at least 10 digits).</p>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Property Address</label>
        <input style={inputStyle("address")} placeholder="Street address, city" value={form.address} onChange={(e) => update("address", e.target.value)} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Email (optional)</label>
        <input style={inputStyle("email")} placeholder="jordan@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
        {errors.email && <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>That doesn't look like a valid email address.</p>}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Best Time to Reach You</label>
        <select style={{ ...inputStyle("time"), appearance: "auto" as const }} value={form.time} onChange={(e) => update("time", e.target.value)}>
          <option>As soon as possible</option>
          <option>Morning (9am–12pm)</option>
          <option>Afternoon (12pm–5pm)</option>
          <option>Evening (5pm–8pm)</option>
          <option>Anytime</option>
        </select>
      </div>

      <button
        onClick={submit}
        disabled={submitting}
        style={{ width: "100%", padding: "12px", background: accent, color: C.white, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Sending…" : urgent ? "Send to On-Call Team Now" : "Submit"}
      </button>
      {error && (
        <p style={{ fontSize: 12, color: C.red, marginTop: 10, textAlign: "center" as const, lineHeight: 1.4 }}>
          Something went wrong sending your details — please try again, or call us directly.
        </p>
      )}
    </div>
  );
}

function Confirmation({ leadData }: { leadData: any }) {
  const [copied, setCopied] = useState(false);

  const copySummary = () => {
    const lines = leadData.transcript.map((m: any) => `${m.role === "user" ? "VISITOR" : "ASSISTANT"}: ${m.content}`).join("\n");
    const photoLines = leadData.photos?.length ? `\nPHOTOS:\n${leadData.photos.join("\n")}` : "";
    const structured = formatSummaryText(leadData.summary || {}, leadData.urgencyTier, leadData.peril);
    const summary = `--- HAVENBROOK RESTORATION — NEW LEAD ---\n${leadTag(leadData.urgencyTier, leadData.peril)}\nNAME: ${leadData.name}\nPHONE: ${leadData.phone}\nEMAIL: ${leadData.email || "not provided"}\nADDRESS: ${leadData.address}\nBEST TIME: ${leadData.time}\nSUBMITTED: ${new Date(leadData.submittedAt).toLocaleString()}${photoLines}\n\n--- INTAKE SUMMARY ---\n${structured}\n\n--- CONVERSATION TRANSCRIPT ---\n\n${lines}`;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.green}`, borderRadius: 10, padding: "28px 22px", textAlign: "center" as const, marginTop: 6, animation: "fadeSlide 0.35s ease-out" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 22, color: C.green }}>✓</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Thanks, {leadData.name.split(" ")[0]} — you're all set.</p>
      <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginBottom: 18 }}>
        A member of the Havenbrook Restoration team has your details and will reach out {leadData.time === "As soon as possible" ? "as soon as possible" : leadData.time.toLowerCase()}.
        {" "}If anything changes or gets worse before then, call us directly at {PHONE_NUMBER_DISPLAY}.
      </p>
      <button onClick={copySummary} style={{ fontSize: 12, fontWeight: 600, color: C.blue, background: "transparent", border: `1px solid ${C.blueBorder}`, borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>
        {copied ? "Copied ✓" : "Copy lead summary"}
      </button>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"chat" | "contact_form" | "enrichment" | "done">("chat");
  const [leadInfo, setLeadInfo] = useState<any>(null);
  const [finalLeadData, setFinalLeadData] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  const [urgencyTier, setUrgencyTier] = useState("consultative");
  const [peril, setPeril] = useState("");
  const [leadSummary, setLeadSummary] = useState<Record<string, any>>({});
  const [urgentBannerIndex, setUrgentBannerIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevTierRef = useRef("consultative");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, phase]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const needed = el.scrollHeight;
    el.style.height = Math.min(needed, MAX_TEXTAREA_HEIGHT) + "px";
    el.style.overflowY = needed > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [input]);

  const submitToFormspree = async (payload: Record<string, string>) => {
    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch("https://formspree.io/f/xrendjne", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      return res.ok;
    } catch (err) {
      console.error("Formspree submission failed:", err);
      return false;
    }
  };

  const callChat = async (next: any[], contactAlreadySubmitted: boolean) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next.map(toApiMessage) }),
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON response body — falls through to the generic error message below
    }

    if (!res.ok) {
      setMessages([...next, { role: "assistant", content: data?.error || "Sorry, something went wrong on my end — mind trying that again?" }]);
      return;
    }

    const reply = data?.message || "Sorry, something went wrong on my end — mind trying that again?";

    let mergedSummary = leadSummary;
    if (data?.summary && typeof data.summary === "object") {
      mergedSummary = { ...leadSummary, ...data.summary };
      setLeadSummary(mergedSummary);
    }
    const newTier = data?.urgencyTier || "consultative";
    const newPeril = data?.peril || peril;
    if (data?.urgencyTier) setUrgencyTier(newTier);
    if (data?.peril) setPeril(newPeril);

    const flagThisAsUrgent = prevTierRef.current === "consultative" && newTier !== "consultative" && urgentBannerIndex === null;
    if (flagThisAsUrgent) setUrgentBannerIndex(next.length);
    prevTierRef.current = newTier;

    setMessages([...next, { role: "assistant", content: reply }]);

    if (data?.readyForContactForm && !contactAlreadySubmitted) {
      setPhase("contact_form");
    }

    if (data?.conversationComplete && contactAlreadySubmitted) {
      const transcriptForSubmit = [...next, { role: "assistant", content: reply }];
      const payload = {
        _subject: `${leadTag(newTier, newPeril)} Update — ${leadInfo?.name || "Havenbrook lead"}`,
        status: "complete",
        leadTag: leadTag(newTier, newPeril),
        name: leadInfo?.name || "",
        phone: leadInfo?.phone || "",
        contactEmail: leadInfo?.email || "not provided",
        address: leadInfo?.address || "",
        bestTime: leadInfo?.time || "",
        peril: newPeril,
        urgency: newTier,
        intakeSummary: formatSummaryText(mergedSummary, newTier, newPeril),
        photos: photos.join(", ") || "none attached",
        transcript: transcriptForSubmit.map((m: any) => `${m.role === "user" ? "VISITOR" : "ASSISTANT"}: ${m.content}`).join("\n"),
      };
      // Deliberately NOT keying this "email": Formspree auto-validates any field
      // literally named "email" as a real email address and rejects the whole
      // submission (422) if it isn't one. Email is optional on our form, so a
      // placeholder like "not provided" would silently drop every emailless lead.
      submitToFormspree(payload);
      setFinalLeadData({
        ...leadInfo,
        urgencyTier: newTier,
        peril: newPeril,
        summary: mergedSummary,
        photos,
        transcript: transcriptForSubmit,
      });
      setPhase("done");
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || loading || phase === "contact_form" || phase === "done") return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      await callChat(next, phase === "enrichment");
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again in a moment, or call us directly." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessages((m) => [...m, { role: "assistant", content: "That file's a bit large — could you try a photo under 10MB?" }]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Filename": file.name },
        body: file,
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON response — treated as failure below
      }
      if (res.ok && data?.url) {
        setPhotos((p) => [...p, data.url]);
        const next = [...messages, { role: "user", content: `[Attached a photo: ${data.url}]` }];
        setMessages(next);
        setLoading(true);
        await callChat(next, phase === "enrichment");
        setLoading(false);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `That upload didn't go through (${data?.error || "unknown error"}) — mind trying again?` }]);
      }
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `That upload didn't go through (${err?.message || "network error"}) — mind trying again?` }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleContactSubmit = async (data: any) => {
    setFormError(false);
    setFormSubmitting(true);
    try {
      const payload = {
        _subject: `${leadTag(urgencyTier, peril)} New Havenbrook lead — ${data.name}`,
        status: "initial capture — enrichment in progress",
        leadTag: leadTag(urgencyTier, peril),
        name: data.name,
        phone: data.phone,
        contactEmail: data.email || "not provided",
        address: data.address,
        bestTime: data.time,
        peril: peril,
        urgency: urgencyTier,
        intakeSummary: formatSummaryText(leadSummary, urgencyTier, peril),
        photos: photos.join(", ") || "none attached",
        transcript: messages.map((m: any) => `${m.role === "user" ? "VISITOR" : "ASSISTANT"}: ${m.content}`).join("\n"),
        _gotcha: data.honeypot || "",
      };
      // Fire-and-forget: this is the critical early capture, sent before any
      // enrichment questions are asked, so the visitor is never blocked on it.
      submitToFormspree(payload);
      setLeadInfo(data);

      const noteText = `[SYSTEM_NOTE: Contact information received — name: ${data.name}, phone: ${data.phone}, address: ${data.address}. Continue the conversation naturally; do not ask for contact details again.]`;
      const next = [...messages, { role: "user", content: noteText }];
      setMessages(next);
      setPhase("enrichment");
      setLoading(true);
      await callChat(next, true);
    } catch {
      setFormError(true);
    } finally {
      setFormSubmitting(false);
      setLoading(false);
    }
  };

  const urgent = urgencyTier !== "consultative";
  const headerPillText =
    urgencyTier === "emergency" ? "⚠ EMERGENCY — WE'RE ON IT" : urgencyTier === "urgent" ? "✦ URGENT REQUEST — RESPONDING FAST" : "✦ 24/7 RESPONSE · FREE ASSESSMENT";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: C.bg }}>
      <div style={{ width: "100%", maxWidth: 560, background: C.white, borderRadius: 14, boxShadow: "0 12px 40px rgba(24,38,54,0.14)", overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ background: C.blue, padding: "20px 22px", color: C.white }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldIcon />
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: 0.3 }}>HAVENBROOK RESTORATION</div>
                <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 1, marginTop: 2 }}>WATER · FIRE · MOLD · STORM — ONTARIO</div>
              </div>
            </div>
            <a href={`tel:${PHONE_NUMBER_TEL}`} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: C.white, padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              <PhoneIcon />
              CALL NOW
            </a>
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: 12,
              background: urgencyTier === "emergency" ? C.ember : "rgba(255,255,255,0.14)",
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              transition: "background 0.25s",
            }}
          >
            {headerPillText}
          </div>
        </div>

        <div ref={scrollRef} style={{ height: 440, overflowY: "auto", padding: "18px 20px", background: C.bg }}>
          {messages.map((m, i) => {
            const isPhoto = m.role === "user" && m.content.startsWith("[Attached a photo:");
            const isNote = m.role === "user" && m.content.startsWith("[SYSTEM_NOTE:");
            const photoUrl = isPhoto ? m.content.match(/: (.*)\]/)?.[1] : null;
            const isUrgentFlag = i === urgentBannerIndex;

            if (isNote) {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueSubtle, border: `1px solid ${C.blueBorder}`, borderRadius: 20, padding: "5px 12px" }}>
                    ✓ Contact info sent to our on-call team
                  </div>
                </div>
              );
            }

            return (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
                <div
                  style={{
                    maxWidth: "82%",
                    padding: isPhoto ? 6 : "11px 15px",
                    borderRadius: 14,
                    background: m.role === "user" ? C.blue : C.bubbleAi,
                    color: m.role === "user" ? C.white : C.text,
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: isPhoto ? "normal" : "pre-wrap",
                    overflowWrap: "break-word",
                    border: isUrgentFlag ? `1px solid ${C.emberBorder}` : "none",
                    borderLeft: isUrgentFlag ? `3px solid ${C.ember}` : undefined,
                    boxShadow: isUrgentFlag ? `0 0 0 1px ${C.emberSubtle}` : undefined,
                  }}
                >
                  {isUrgentFlag && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.emberDark, letterSpacing: 0.6, marginBottom: 4 }}>⚠ SAFETY FIRST</div>
                  )}
                  {isPhoto && photoUrl ? <img src={photoUrl} alt="Attached property photo" style={{ maxWidth: 200, borderRadius: 10, display: "block" }} /> : m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{ background: C.bubbleAi, borderRadius: 14 }}>
                <TypingDots />
              </div>
            </div>
          )}
          {phase === "contact_form" && (
            <ContactForm urgent={urgent} submitting={formSubmitting} error={formError} onSubmit={handleContactSubmit} />
          )}
          {phase === "done" && finalLeadData && <Confirmation leadData={finalLeadData} />}
        </div>

        {phase === "enrichment" && (
          <div style={{ padding: "8px 20px", background: urgent ? C.emberSubtle : C.blueSubtle, borderTop: `1px solid ${C.border}`, animation: "bannerSlide 0.3s ease-out" }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: urgent ? C.emberDark : C.blueDark, margin: 0, textAlign: "center" as const }}>
              ✓ Your details are with our on-call team. A few more questions will help the crew arrive prepared.
            </p>
          </div>
        )}

        {(phase === "chat" || phase === "enrichment") && (
          <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}`, background: C.white }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading || loading} title="Attach a photo" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {uploading ? "…" : "📎"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAttach} style={{ display: "none" }} />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Describe your situation…"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 20,
                  border: `1px solid ${C.border}`,
                  fontSize: 14,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  overflowY: "hidden",
                }}
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: "none", background: urgent ? C.ember : C.blue, color: C.white, cursor: "pointer", fontSize: 16, opacity: loading || !input.trim() ? 0.5 : 1 }}>
                ➤
              </button>
            </div>
            <p style={{ fontSize: 10.5, color: C.textMuted, textAlign: "center", marginTop: 10, lineHeight: 1.4 }}>
              This tool provides general information only and is not an assessment, quote, or coverage determination. Serving the Greater Toronto Area and surrounding Ontario communities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
