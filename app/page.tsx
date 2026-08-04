"use client";

import { useState, useRef, useEffect } from "react";

const GREETING =
  "Hi, thanks for reaching out. Tell me what happened at the property, and I’ll ask a few questions to help our team understand the situation.";

const MAX_TEXTAREA_HEIGHT = 120;
const PHONE_NUMBER_DISPLAY = "(800) 555-0174";
const PHONE_NUMBER_TEL = "+18005550174";

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
  mustyOrVisibleMold: "Musty Smell / Visible Mould",
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
  extentVsThreshold: "Mould Extent (Health Canada scale)",
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

const PERIL_DISPLAY: Record<string, string> = { mold: "MOULD" };

function leadTag(urgencyTier: string, peril: string) {
  const tierPrefix = urgencyTier === "emergency" ? "EMERGENCY" : urgencyTier === "urgent" ? "URGENT" : "LEAD";
  const perilLabel = PERIL_DISPLAY[peril] || (peril || "OTHER").toUpperCase();
  return `[${tierPrefix}-${perilLabel}]`;
}

function generateLeadId() {
  return `HB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

type ChatMessage = { role: string; content: string; kind?: "photo" | "note" };

// `kind` is only ever set by our own code (handleAttach, handleContactSubmit) — never derived
// from parsing a message's text. A visitor typing literal "[SYSTEM_NOTE: ...]" or
// "[Attached a photo: ...]" into the chat box produces a message with no `kind` at all, so it
// can never be mistaken for a trusted system event, either in rendering or in what gets sent
// to the model. This was previously string-pattern-based and spoofable.
function toApiMessage(m: ChatMessage) {
  if (m.role === "user" && m.kind === "photo") {
    return {
      role: "user",
      content: [
        { type: "image", source: { type: "url", url: m.content } },
        {
          type: "text",
          text: "Here's the photo I attached. Take a close look at what's actually in it before responding.",
        },
      ],
    };
  }
  if (m.role === "user" && m.kind === "note") {
    return { role: "user", content: m.content };
  }
  return { role: m.role, content: m.content };
}

function Icon({
  name,
  size = 18,
}: {
  name: "phone" | "water" | "fire" | "mould" | "storm" | "shield" | "send" | "attach" | "lock" | "check" | "alert";
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    phone: <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.16.38 2.37.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.62 21 3 13.38 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.22.2 2.42.57 3.58a1 1 0 0 1-.25 1.02z" />,
    water: <path d="M12 2.5S5.5 9.2 5.5 14.1a6.5 6.5 0 0 0 13 0C18.5 9.2 12 2.5 12 2.5Zm-3.1 12a3.3 3.3 0 0 0 3.3 3.3" />,
    fire: <path d="M13.6 2.7c.7 3.2-.5 4.6-1.8 6.1-1.1-1-1.5-2-1.4-3.2-2.5 2-4.4 4.8-4.4 8.1a6 6 0 0 0 12 0c0-4.8-2.8-8.2-4.4-11Zm-1.5 17.1a3 3 0 0 1-3-3c0-1.8 1.1-3.2 2.6-4.6.1 1.3.7 2.2 1.5 3 .7-.8 1.2-1.7 1.3-2.8.9 1.2 1.5 2.5 1.5 4.1a3.3 3.3 0 0 1-3.9 3.3Z" />,
    mould: <><path d="M12 20.5c4.5 0 7.5-3.1 7.5-7.5V5.2c-4.4 0-7.5 2-7.5 6.7 0-3.5-2.5-5.7-7.5-5.7V13c0 4.4 3 7.5 7.5 7.5Z" /><path d="M12 20.5v-8.6m0 3.7 3.4-3.4M12 16l-3.6-3.6" /></>,
    storm: <><path d="M8.4 16.5H6.8a4.3 4.3 0 1 1 1-8.5A6 6 0 0 1 19 10.7a3.1 3.1 0 0 1-.5 6.1h-2" /><path d="m12 13-2 4h3l-1.3 4 4.3-6h-3l1.4-2" /></>,
    shield: <><path d="M12 3 19 6v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" /><path d="m9 12.2 2 2 4-4.2" /></>,
    send: <><path d="m4 4 16 8-16 8 3-8-3-8Z" /><path d="M7 12h13" /></>,
    attach: <path d="m20.5 11.5-8.2 8.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 0 1 5.7 5.7l-8.6 8.6a2 2 0 1 1-2.8-2.8l8-8" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    check: <path d="m5 12.5 4.2 4.2L19.5 6.5" />,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="18" fill="#0B8EB4" />
      <path d="M32 13.5s-13 13.3-13 23a13 13 0 0 0 26 0c0-9.7-13-23-13-23Z" stroke="white" strokeWidth="3.2" />
      <path d="M25.3 36.8 30 41.5l9.4-10.1" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="typing-bubble" aria-label="Havenbrook is typing">
      <span />
      <span />
      <span />
    </div>
  );
}

const PHONE_DIGITS_RE = /\d/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function RedesignedContactForm({
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
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: false }));
  };

  const validate = () => {
    const nextErrors: Record<string, boolean> = {};
    if (!form.name.trim()) nextErrors.name = true;
    const phoneDigits = (form.phone.match(PHONE_DIGITS_RE) || []).length;
    if (!form.phone.trim() || phoneDigits < 10) nextErrors.phone = true;
    if (!form.address.trim()) nextErrors.address = true;
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) nextErrors.email = true;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = () => {
    if (!submitting && validate()) {
      onSubmit({ ...form, honeypot, submittedAt: new Date().toISOString() });
    }
  };

  return (
    <section className={urgent ? "contact-card urgent" : "contact-card"} aria-labelledby="contact-card-title">
      <div className="contact-card-head">
        <div className="contact-card-icon">
          <Icon name={urgent ? "alert" : "phone"} size={20} />
        </div>
        <h2 id="contact-card-title">{urgent ? "Let’s connect you with the on-call team" : "How should the team reach you?"}</h2>
        <p>{urgent ? "Send the essentials now. We’ll keep gathering useful details after your request is received." : "Share the best contact details for this property and the team will review your request."}</p>
      </div>

      <input
        type="text"
        name="_gotcha"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className="contact-fields">
        <div className="field">
          <label htmlFor="lead-name">Full name</label>
          <input
            id="lead-name"
            className={errors.name ? "invalid" : ""}
            placeholder="Jordan Reyes"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            autoComplete="name"
            aria-invalid={errors.name || undefined}
          />
        </div>

        <div className="field">
          <label htmlFor="lead-phone">Best number</label>
          <input
            id="lead-phone"
            type="tel"
            inputMode="tel"
            className={errors.phone ? "invalid" : ""}
            placeholder="(416) 000-0000"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            autoComplete="tel"
            aria-invalid={errors.phone || undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <p className="field-error" id="phone-error">Enter a valid 10-digit phone number.</p>}
        </div>

        <div className="field full">
          <label htmlFor="lead-address">Property address</label>
          <input
            id="lead-address"
            className={errors.address ? "invalid" : ""}
            placeholder="Street address, city"
            value={form.address}
            onChange={(event) => update("address", event.target.value)}
            autoComplete="street-address"
            aria-invalid={errors.address || undefined}
          />
        </div>

        <div className="field">
          <label htmlFor="lead-email">Email <span style={{ fontWeight: 500, textTransform: "none" }}>(optional)</span></label>
          <input
            id="lead-email"
            type="email"
            inputMode="email"
            className={errors.email ? "invalid" : ""}
            placeholder="jordan@example.com"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            autoComplete="email"
            aria-invalid={errors.email || undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && <p className="field-error" id="email-error">Enter a valid email address.</p>}
        </div>

        <div className="field">
          <label htmlFor="lead-time">Best time</label>
          <select id="lead-time" value={form.time} onChange={(event) => update("time", event.target.value)}>
            <option>As soon as possible</option>
            <option>Morning (9am–12pm)</option>
            <option>Afternoon (12pm–5pm)</option>
            <option>Evening (5pm–8pm)</option>
            <option>Anytime</option>
          </select>
        </div>

        <button className="submit-button" type="button" onClick={submit} disabled={submitting}>
          {submitting ? "Sending request…" : urgent ? "Send urgent request" : "Send request"}
          {!submitting && <Icon name="send" size={16} />}
        </button>

        {error && (
          <p className="form-error" role="alert">
            We couldn’t send your details. Please try again or call {PHONE_NUMBER_DISPLAY} directly.
          </p>
        )}

        <p className="privacy-note">
          <Icon name="lock" size={13} />
          Your details are used to respond to this restoration request. Don’t include payment information or government identification.
        </p>
      </div>
    </section>
  );
}

function RedesignedConfirmation({ leadData }: { leadData: any }) {
  const firstName = leadData.name.split(" ")[0];
  const timing = leadData.time === "As soon as possible" ? "as soon as possible" : leadData.time.toLowerCase();

  return (
    <section className="confirmation-card" aria-live="polite">
      <div className="confirmation-icon">
        <Icon name="check" size={26} />
      </div>
      <h2>Request received, {firstName}.</h2>
      <p>
        The Havenbrook team has your details and will follow up {timing}. If the situation changes or becomes unsafe, leave the area and call the appropriate emergency service. You can also call Havenbrook directly at {PHONE_NUMBER_DISPLAY}.
      </p>
    </section>
  );
}

const QUICK_STARTS = [
  { label: "Water damage", icon: "water" as const, prompt: "I have water damage at the property." },
  { label: "Fire or smoke", icon: "fire" as const, prompt: "I have fire or smoke damage at the property." },
  { label: "Mould concern", icon: "mould" as const, prompt: "I’m concerned about mould at the property." },
  { label: "Storm damage", icon: "storm" as const, prompt: "I have storm damage at the property." },
];

function RedesignedShell({
  messages,
  loading,
  phase,
  input,
  setInput,
  send,
  uploading,
  handleAttach,
  fileInputRef,
  textareaRef,
  scrollRef,
  urgencyTier,
  urgentBannerIndex,
  formSubmitting,
  formError,
  handleContactSubmit,
  finalLeadData,
  urgent,
}: {
  messages: ChatMessage[];
  loading: boolean;
  phase: "chat" | "contact_form" | "enrichment" | "done";
  input: string;
  setInput: (value: string) => void;
  send: (value: string) => void;
  uploading: boolean;
  handleAttach: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  scrollRef: React.RefObject<HTMLDivElement>;
  urgencyTier: string;
  urgentBannerIndex: number | null;
  formSubmitting: boolean;
  formError: boolean;
  handleContactSubmit: (data: any) => void;
  finalLeadData: any;
  urgent: boolean;
}) {
  const contactConfirmed = phase === "enrichment" || phase === "done";
  const statusText =
    urgencyTier === "emergency"
      ? contactConfirmed
        ? "Emergency request received"
        : "Emergency guidance"
      : urgencyTier === "urgent"
      ? contactConfirmed
        ? "Urgent request received"
        : "Urgent situation identified"
      : "Intake assistant online";

  const activeStep = phase === "chat" ? 1 : phase === "contact_form" ? 2 : 3;

  return (
    <main className="app-shell">
      <section className="demo-frame" aria-label="Havenbrook Restoration intake">
        <aside className="brand-panel">
          <div className="brand-lockup">
            <BrandMark />
            <div>
              <div className="brand-name">Havenbrook</div>
              <div className="brand-kicker">Restoration Services</div>
            </div>
          </div>

          <div className="brand-copy">
            <div className="eyebrow">Ontario response team</div>
            <h1>Clear next steps when <em>every minute matters.</em></h1>
            <p>
              Tell us what happened. The intake assistant will identify immediate safety concerns and gather the details the restoration team needs.
            </p>

            <div className="service-grid" aria-label="Restoration services">
              {QUICK_STARTS.map((item) => (
                <div className="service-chip-static" key={item.label}>
                  <Icon name={item.icon} size={15} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="response-card">
            <span className="response-pulse" />
            <div>
              <strong>Intake available 24/7</strong>
              <span>Greater Toronto Area and surrounding communities</span>
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <header className="chat-header">
            <div className="mobile-brand">
              <BrandMark />
              <div>
                <strong>Havenbrook Restoration</strong>
                <span>Ontario response team</span>
              </div>
            </div>

            <div className="status-block" aria-live="polite">
              <div className="status-row">
                <span className={urgent ? "status-dot urgent" : "status-dot"} />
                <span className="status-label">{statusText}</span>
              </div>
              <p className="status-subtitle">Safety first. One clear question at a time.</p>
            </div>

            <a className="call-button" href={"tel:" + PHONE_NUMBER_TEL} aria-label={"Call Havenbrook Restoration at " + PHONE_NUMBER_DISPLAY}>
              <Icon name="phone" size={15} />
              Call now
            </a>
          </header>

          <div className="progress-rail" aria-label={"Intake progress, step " + activeStep + " of 3"}>
            {["Situation", "Callback", "Details"].map((label, index) => {
              const step = index + 1;
              const className = step < activeStep ? "progress-step complete" : step === activeStep ? "progress-step active" : "progress-step";
              return (
                <div className={className} key={label}>
                  <span className="progress-number">{step < activeStep ? "✓" : step}</span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="transcript" ref={scrollRef} aria-live="polite">
            <div className="assistant-intro">
              <span className="assistant-avatar"><Icon name="shield" size={15} /></span>
              Havenbrook intake assistant
            </div>

            {messages.map((message, index) => {
              const isPhoto = message.role === "user" && message.kind === "photo";
              const isNote = message.role === "user" && message.kind === "note";
              const isUrgentFlag = index === urgentBannerIndex;

              if (isNote) {
                return (
                  <div className="system-note" key={index}>
                    <Icon name="check" size={13} />
                    Request details successfully sent
                  </div>
                );
              }

              return (
                <div className={"message-row " + (message.role === "user" ? "user" : "assistant")} key={index}>
                  <div className={"message-bubble" + (isPhoto ? " photo" : "") + (isUrgentFlag ? " safety" : "")}>
                    {isUrgentFlag && (
                      <div className="safety-label">
                        <Icon name="alert" size={12} />
                        Safety first
                      </div>
                    )}
                    {isPhoto ? (
                      <img src={message.content} alt="Attached property photo" />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              );
            })}

            {messages.length === 1 && phase === "chat" && !loading && (
              <div className="quick-start">
                <p className="quick-start-label">Choose a starting point or describe the situation below.</p>
                <div className="quick-start-options">
                  {QUICK_STARTS.map((item) => (
                    <button className="quick-action" type="button" onClick={() => send(item.prompt)} key={item.label}>
                      <Icon name={item.icon} size={15} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="message-row assistant">
                <TypingDots />
              </div>
            )}

            {phase === "contact_form" && (
              <RedesignedContactForm urgent={urgent} submitting={formSubmitting} error={formError} onSubmit={handleContactSubmit} />
            )}

            {phase === "done" && finalLeadData && <RedesignedConfirmation leadData={finalLeadData} />}
          </div>

          {phase === "enrichment" && (
            <div className="confirmed-banner">
              ✓ Your request is with the team. A few more questions will help them understand the property and damage.
            </div>
          )}

          {(phase === "chat" || phase === "enrichment") && (
            <footer className="composer">
              <div className="composer-row">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || loading}
                  aria-label={uploading ? "Uploading photo" : "Attach a property photo"}
                  title="Attach a property photo"
                >
                  {uploading ? <span aria-hidden="true">…</span> : <Icon name="attach" size={18} />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAttach} hidden />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Describe what happened…"
                  disabled={loading}
                  rows={1}
                  aria-label="Describe your restoration situation"
                />
                <button
                  className={"send-button" + (urgent ? " urgent" : "")}
                  type="button"
                  onClick={() => send(input)}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                >
                  <Icon name="send" size={18} />
                </button>
              </div>
              <div className="composer-meta">
                <span>General information only — not an assessment, quote or coverage decision.</span>
              </div>
            </footer>
          )}
        </section>
      </section>
    </main>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
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

  const submitToFormspree = async (payload: Record<string, string>, retriesLeft = 1): Promise<boolean> => {
    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch("https://formspree.io/f/xrendjne", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      if (res.ok) return true;
      console.error("Formspree submission returned non-OK status:", res.status);
      if (retriesLeft > 0) return submitToFormspree(payload, retriesLeft - 1);
      return false;
    } catch (err) {
      console.error("Formspree submission failed:", err);
      if (retriesLeft > 0) return submitToFormspree(payload, retriesLeft - 1);
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
      // Not awaited: by this point the visitor has already been told they're done and has
      // the direct phone number on screen as a fallback, so there's nothing actionable left
      // for them to do — blocking the confirmation screen on this second, lower-stakes
      // submission would be worse UX with no upside. submitToFormspree already retries once
      // internally; log clearly if it still fails so it's visible in Vercel logs.
      submitToFormspree({ ...payload, leadId: leadInfo?.leadId || "" }).then((delivered) => {
        if (!delivered) console.error(`Final Formspree update failed to deliver for lead ${leadInfo?.leadId || "(no id)"}  (${leadInfo?.name || "unknown"})`);
      });
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
        const next: ChatMessage[] = [...messages, { role: "user", content: data.url, kind: "photo" }];
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
    const leadId = generateLeadId();
    try {
      const payload = {
        _subject: `${leadTag(urgencyTier, peril)} New Havenbrook lead — ${data.name} [${leadId}]`,
        status: "initial capture — enrichment in progress",
        leadTag: leadTag(urgencyTier, peril),
        leadId,
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
      // Awaited, with an internal retry (see submitToFormspree) — this is the critical early
      // capture. The visitor must not be told their details are with the on-call team unless
      // that's actually true, so we wait for real confirmation before doing anything else.
      const delivered = await submitToFormspree(payload);
      if (!delivered) {
        setFormError(true);
        return;
      }

      setLeadInfo({ ...data, leadId });

      const noteText = `Contact information received — name: ${data.name}, phone: ${data.phone}, address: ${data.address}. Continue the conversation naturally; do not ask for contact details again.`;
      const next: ChatMessage[] = [...messages, { role: "user", content: noteText, kind: "note" }];
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

  return (
    <RedesignedShell
      messages={messages}
      loading={loading}
      phase={phase}
      input={input}
      setInput={setInput}
      send={send}
      uploading={uploading}
      handleAttach={handleAttach}
      fileInputRef={fileInputRef}
      textareaRef={textareaRef}
      scrollRef={scrollRef}
      urgencyTier={urgencyTier}
      urgentBannerIndex={urgentBannerIndex}
      formSubmitting={formSubmitting}
      formError={formError}
      handleContactSubmit={handleContactSubmit}
      finalLeadData={finalLeadData}
      urgent={urgent}
    />
  );
}
