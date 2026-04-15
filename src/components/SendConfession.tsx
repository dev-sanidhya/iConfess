"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowRight, MessageSquare, AtSign, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import ManualPaymentDialog from "@/components/ManualPaymentDialog";
import {
  getConciseCategorySummary,
  locationCategories,
  locationFields,
  searchDetailFields,
  type LocationCategory,
  type SearchResultProfileSection,
} from "@/lib/matching";
import { formatInr } from "@/lib/pricing";
import { type SharedProfileOption } from "@/lib/shared-profile-context";
import { toast } from "sonner";
import { normalizeComparableFullName, normalizeComparableHandle } from "@/lib/confessions";
import PhoneNumberField from "@/components/PhoneNumberField";
import { usePaymentCatalog } from "@/lib/use-payment-catalog";
import { getErrorMessage, getResponseErrorMessage } from "@/lib/utils";

type FlowType = "profile" | "phone" | "social";
type DeliveryMode = "delivered" | "phone_outreach" | "pending_registration";
type SearchState = "idle" | "loading" | "ready" | "error";

type SearchResult = {
  id: string;
  name: string;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  primaryCategory: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  matchContext: string[];
  confessionCount: number;
  hasUnlockedInsights: boolean;
  profileSections: SearchResultProfileSection[];
  college: string | null;
  school: string | null;
  workplace: string | null;
  gym: string | null;
  neighbourhood: string | null;
  isShadow: boolean;
};

type CurrentUserSummary = {
  id: string;
  name: string;
  phone: string;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  gender: "MALE" | "FEMALE" | "OTHER";
};

type RecipientPreview = {
  mode: "matched" | "entered" | "searching";
  title: string;
  summary: string;
  statusLabel: string;
  statusText: string;
  note: string;
};

function getDeliveryMessage(mode: DeliveryMode) {
  if (mode === "delivered") return "Your confession has been delivered.";
  if (mode === "phone_outreach") return "We will reach out to them right away without revealing your identity.";
  return "Your confession will stay pending and be delivered as soon as they register.";
}

function getDisplayName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || "Unnamed recipient";
}

function getSelectedSection(result: SearchResult, selectedCategory: LocationCategory | null) {
  if (!selectedCategory) return result.profileSections[0] ?? null;
  return result.profileSections.find((section) => section.key === selectedCategory) ?? result.profileSections[0] ?? null;
}

function getEnteredProfileSummary(category: LocationCategory | null, details: Record<string, string>) {
  if (!category) return "Choose the place you know them from.";
  if (category === "COLLEGE") return [details.branch?.trim(), details.section?.trim(), details.yearOfPassing?.trim(), details.collegeName?.trim()].filter(Boolean).join(" · ");
  if (category === "SCHOOL") return [details.yearOfCompletion?.trim(), details.schoolName?.trim()].filter(Boolean).join(" · ");
  if (category === "WORKPLACE") return [details.companyName?.trim(), details.city?.trim()].filter(Boolean).join(" · ");
  if (category === "GYM") return [details.gymName?.trim(), details.pinCode?.trim(), details.timing?.trim()].filter(Boolean).join(" · ");
  return [details.homeNumber?.trim(), details.premisesName?.trim(), details.city?.trim(), details.state?.trim(), details.pinCode?.trim()].filter(Boolean).join(" · ");
}

function buildMatchedPreview(result: SearchResult, flow: FlowType, selectedCategory: LocationCategory | null): RecipientPreview {
  const selectedSection = getSelectedSection(result, selectedCategory);
  const statusText = result.isShadow
    ? flow === "phone"
      ? "Matched this phone number to an unregistered iConfess profile."
      : flow === "social"
        ? "Matched this social handle to an unregistered iConfess profile."
        : "This confession will stay linked to the selected unregistered profile."
    : flow === "phone"
      ? "Matched this phone number to a registered iConfess user."
      : flow === "social"
        ? "Matched this social handle to a registered iConfess user."
        : "This confession will be delivered to the selected registered profile.";
  const summary = flow === "phone"
    ? (result.matchContext[0] ?? "Matched by phone number")
    : flow === "social"
      ? (result.matchContext[0] ?? "Matched by social handle")
      : (selectedSection ? getConciseCategorySummary(selectedSection) : (result.matchContext[0] ?? "Registered on iConfess"));

  return {
    mode: "matched",
    title: result.name,
    summary,
    statusLabel: result.isShadow ? "Unregistered" : "Registered User",
    statusText,
    note: result.isShadow
      ? "Your confession will stay on this unregistered profile until it is claimed."
      : "Your confession will go directly to this user.",
  };
}

function buildEnteredPreview(
  flow: FlowType,
  firstName: string,
  lastName: string,
  selectedCategory: LocationCategory | null,
  matchDetails: Record<string, string>,
  targetPhone: string,
  socialPlatform: "instagram" | "snapchat",
  socialHandle: string
): RecipientPreview | null {
  const title = getDisplayName(firstName, lastName);

  if (flow === "profile") {
    if (!firstName.trim() && !selectedCategory) return null;
    return {
      mode: "entered",
      title,
      summary: getEnteredProfileSummary(selectedCategory, matchDetails) || "Using the details entered by the confessor.",
      statusLabel: "",
      statusText: "No specific registered user is selected yet.",
      note: "This confession will stay pending until the right person registers.",
    };
  }

  if (flow === "phone") {
    if (!targetPhone.trim()) return null;
    return {
      mode: "entered",
      title,
      summary: `Phone: +91${targetPhone}`,
      statusLabel: "",
      statusText: "This user is not registered with us but ",
      note: "we will notify them on this number that there is a confession for them on iConfess.",
    };
  }

  if (!socialHandle.trim()) return null;
  return {
    mode: "entered",
    title,
    summary: `${socialPlatform === "instagram" ? "Instagram" : "Snapchat"}: @${socialHandle.trim().replace(/^@+/, "")}`,
    statusLabel: "",
    statusText: "No registered user was found for this handle yet.",
    note: "This confession will stay pending until this person registers.",
  };
}

function buildSearchingPreview(
  flow: FlowType,
  firstName: string,
  lastName: string,
  selectedCategory: LocationCategory | null,
  matchDetails: Record<string, string>,
  targetPhone: string,
  socialPlatform: "instagram" | "snapchat",
  socialHandle: string
): RecipientPreview | null {
  const entered = buildEnteredPreview(flow, firstName, lastName, selectedCategory, matchDetails, targetPhone, socialPlatform, socialHandle);
  if (!entered) return null;
  return { ...entered, mode: "searching", statusLabel: "Checking iConfess", statusText: "Looking for a registered user with these details." };
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function formatGenderLabel(value: "MALE" | "FEMALE" | "OTHER") {
  if (value === "MALE") return "Male";
  if (value === "FEMALE") return "Female";
  return "Other";
}

export default function SendConfession({
  sentCount,
  sharedProfileOptions,
  currentUser,
}: {
  sentCount: number;
  sharedProfileOptions: SharedProfileOption[];
  currentUser: CurrentUserSummary;
}) {
  const router = useRouter();
  const paymentCatalog = usePaymentCatalog();
  const currentPricing = paymentCatalog.pricing;
  const [localSentCount, setLocalSentCount] = useState(sentCount);
  const [flow, setFlow] = useState<FlowType>("phone");
  const [selectedCategory, setSelectedCategory] = useState<LocationCategory | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [socialPlatform, setSocialPlatform] = useState<"instagram" | "snapchat">("instagram");
  const [socialHandle, setSocialHandle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedSharedProfileCategory, setSelectedSharedProfileCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState("We'll keep you updated on every step.");
  const [profileMatches, setProfileMatches] = useState<SearchResult[]>([]);
  const [profileSearchState, setProfileSearchState] = useState<SearchState>("idle");
  const [profileSearchError, setProfileSearchError] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [directMatch, setDirectMatch] = useState<SearchResult | null>(null);
  const [directSearchState, setDirectSearchState] = useState<SearchState>("idle");
  const [showSelfConfirm, setShowSelfConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selfGenderOverride, setSelfGenderOverride] = useState<"MALE" | "FEMALE" | "OTHER">(currentUser.gender);
  const [selfPopupDismissed, setSelfPopupDismissed] = useState(false);
  const categoryFieldsRef = useRef<HTMLDivElement | null>(null);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    setLocalSentCount(sentCount);
  }, [sentCount]);

  useEffect(() => {
    if (!selectedCategory) return;
    categoryFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedCategory]);

  useEffect(() => {
    if (flow !== "profile" || !selectedCategory) {
      setProfileMatches([]);
      setProfileSearchState("idle");
      setProfileSearchError("");
      setSelectedProfileId(null);
      return;
    }

    const trimmedFirstName = firstName.trim();
    const requiredFields = searchDetailFields[selectedCategory].filter((field) => field.required && field.key !== "firstName");
    const hasRequiredFields = requiredFields.every((field) => (matchDetails[field.key] ?? "").trim());

    if (!trimmedFirstName || !hasRequiredFields) {
      setProfileMatches([]);
      setProfileSearchState("idle");
      setProfileSearchError("");
      setSelectedProfileId(null);
      return;
    }

    const params = new URLSearchParams({ mode: "profile", location: selectedCategory, firstName: trimmedFirstName });
    const trimmedLastName = lastName.trim();
    if (trimmedLastName) params.set("lastName", trimmedLastName);
    for (const [key, value] of Object.entries(matchDetails)) {
      const trimmedValue = value.trim();
      if (trimmedValue) params.set(key, trimmedValue);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setProfileSearchState("loading");
      setProfileSearchError("");

      try {
        const res = await fetch(`/api/users/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to find matching profiles");
        if (cancelled) return;
        const results = (data.results ?? []) as SearchResult[];
        setProfileMatches(results);
        setProfileSearchState("ready");
        setSelectedProfileId((current) => (current && results.some((result) => result.id === current) ? current : null));
      } catch (error) {
        if (cancelled) return;
        setProfileMatches([]);
        setProfileSearchState("error");
        setProfileSearchError(error instanceof Error ? error.message : "Failed to find matching profiles");
        setSelectedProfileId(null);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [flow, selectedCategory, firstName, lastName, matchDetails]);

  useEffect(() => {
    if (flow === "profile") {
      setDirectMatch(null);
      setDirectSearchState("idle");
      return;
    }

    const params = new URLSearchParams();
    if (flow === "phone") {
      if (!/^\d{10}$/.test(targetPhone)) {
        setDirectMatch(null);
        setDirectSearchState("idle");
        return;
      }
      params.set("mode", "phone");
      params.set("phone", targetPhone);
    }

    if (flow === "social") {
      const trimmedHandle = socialHandle.trim().replace(/^@+/, "");
      if (!trimmedHandle) {
        setDirectMatch(null);
        setDirectSearchState("idle");
        return;
      }
      params.set("mode", "social");
      params.set("platform", socialPlatform);
      params.set("handle", trimmedHandle);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setDirectSearchState("loading");
      try {
        const res = await fetch(`/api/users/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to look up recipient");
        if (cancelled) return;
        setDirectMatch(((data.results ?? []) as SearchResult[])[0] ?? null);
        setDirectSearchState("ready");
      } catch {
        if (cancelled) return;
        setDirectMatch(null);
        setDirectSearchState("error");
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [flow, targetPhone, socialPlatform, socialHandle]);

  const enteredFullName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim(),
    [firstName, lastName]
  );
  const normalizedEnteredFullName = useMemo(() => normalizeComparableFullName(enteredFullName), [enteredFullName]);
  const normalizedOwnFullName = useMemo(() => normalizeComparableFullName(currentUser.name), [currentUser.name]);
  const selfConfessionCandidate = useMemo(() => {
    if (!normalizedEnteredFullName || normalizedEnteredFullName !== normalizedOwnFullName) {
      return false;
    }

    if (flow === "profile") {
      return selectedProfileId === currentUser.id;
    }

    if (flow === "phone") {
      return normalizePhoneDigits(targetPhone) === normalizePhoneDigits(currentUser.phone);
    }

    const ownHandle = socialPlatform === "instagram" ? currentUser.instagramHandle : currentUser.snapchatHandle;
    return normalizeComparableHandle(socialHandle) === normalizeComparableHandle(ownHandle ?? "");
  }, [
    currentUser.id,
    currentUser.instagramHandle,
    currentUser.phone,
    currentUser.snapchatHandle,
    flow,
    normalizedEnteredFullName,
    normalizedOwnFullName,
    selectedProfileId,
    socialHandle,
    socialPlatform,
    targetPhone,
  ]);
  const sendPriceLabel = selfConfessionCandidate
    ? formatInr(currentPricing.selfConfession)
    : localSentCount === 0
      ? "Free"
      : formatInr(currentPricing.sendConfession);

  function validateForm() {
    if (!message.trim()) {
      toast.error("Write your confession first");
      return false;
    }
    if (!firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (flow === "profile" && !selectedCategory) {
      toast.error("Select a location category");
      return false;
    }
    if (flow === "phone" && !/^\d{10}$/.test(targetPhone)) {
      toast.error("Enter a valid 10-digit number");
      return false;
    }
    if (flow === "social" && !socialHandle.trim()) {
      toast.error("Enter a valid social handle");
      return false;
    }
    if (sharedProfileOptions.length === 0) {
      toast.error("Complete at least one of your own profile fields before sending a confession");
      return false;
    }
    if (!selectedSharedProfileCategory) {
      toast.error("Choose which of your profile fields connects you to this person");
      return false;
    }

    return true;
  }

  async function submitConfession(transactionReference?: string) {
    if (submitInFlightRef.current) {
      return;
    }

    if (!validateForm()) return;

    submitInFlightRef.current = true;
    setLoading(true);
    try {
      const body = flow === "profile"
        ? {
            flow: "profile",
            location: selectedCategory,
            matchDetails: { ...matchDetails, firstName: firstName.trim(), ...(lastName.trim() ? { lastName: lastName.trim() } : {}), fullName: enteredFullName },
            targetUserId: selectedProfile && !selectedProfile.isShadow ? selectedProfile.id : null,
            targetShadowProfileId: selectedProfile?.isShadow ? selectedProfile.id : null,
            sharedProfileCategory: selectedSharedProfileCategory,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            message,
            selfGenderOverride: selfConfessionCandidate ? selfGenderOverride : null,
            transactionReference,
          }
        : flow === "phone"
          ? {
              flow: "phone",
              targetPhone: `+91${targetPhone}`,
              sharedProfileCategory: selectedSharedProfileCategory,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              message,
              selfGenderOverride: selfConfessionCandidate ? selfGenderOverride : null,
              transactionReference,
            }
          : {
              flow: "social",
              platform: socialPlatform,
              handle: socialHandle.trim(),
              sharedProfileCategory: selectedSharedProfileCategory,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              message,
              selfGenderOverride: selfConfessionCandidate ? selfGenderOverride : null,
              transactionReference,
            };

      const res = await fetch("/api/confessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 402 || data.requiresPayment) {
        setShowPaymentDialog(true);
        toast.info(`Payment required: ${formatInr(data.amount ?? currentPricing.sendConfession)}. Submit your UTR after payment.`);
        return;
      }

      if (!res.ok) {
        throw new Error(getResponseErrorMessage(data, "Failed to send confession"));
      } else if (data.pendingReview) {
        if (!selfConfessionCandidate) {
          setLocalSentCount((current) => current + 1);
        }
        setShowPaymentDialog(false);
        setSentMessage("Your confession is queued. It will move forward after payment review.");
        setSent(true);
        toast.success("Payment submitted for review.");
      } else {
        if (!selfConfessionCandidate) {
          setLocalSentCount((current) => current + 1);
        }
        const deliveryMode = (data.deliveryMode ?? (data.matchFound ? "delivered" : "pending_registration")) as DeliveryMode;
        setSentMessage(getDeliveryMessage(deliveryMode));
        setSent(true);
        if (deliveryMode === "delivered") {
          toast.success(selfConfessionCandidate ? "Confession to yourself saved in your received inbox." : selectedProfileId ? "Confession delivered to the selected profile." : "Confession delivered.");
        } else if (deliveryMode === "phone_outreach") {
          toast.success("Confession saved. We'll reach out to them right away without revealing you.");
        } else {
          toast.success("Confession saved in pending. It will be delivered when they register.");
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send confession"));
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitConfession();
  }

  async function handleManualPaymentSubmit(transactionReference: string) {
    await submitConfession(transactionReference);
  }

  function resetForm() {
    router.refresh();
    setSent(false);
    setSentMessage("We'll keep you updated on every step.");
    setMessage("");
    setMatchDetails({});
    setSelectedCategory(null);
    setFirstName("");
    setLastName("");
    setTargetPhone("");
    setSocialHandle("");
    setSelectedSharedProfileCategory("");
    setProfileMatches([]);
    setProfileSearchState("idle");
    setProfileSearchError("");
    setSelectedProfileId(null);
    setDirectMatch(null);
    setDirectSearchState("idle");
    setShowSelfConfirm(false);
    setShowPaymentDialog(false);
    setSelfGenderOverride(currentUser.gender);
    setSelfPopupDismissed(false);
  }

  const selectedProfile = profileMatches.find((result) => result.id === selectedProfileId) ?? null;
  const recipientPreview = useMemo(() => {
    const baseRecipientPreview = selectedProfile
      ? buildMatchedPreview(selectedProfile, flow, selectedCategory)
      : directMatch
        ? buildMatchedPreview(directMatch, flow, selectedCategory)
        : flow !== "profile" && directSearchState === "loading"
          ? buildSearchingPreview(flow, firstName, lastName, selectedCategory, matchDetails, targetPhone, socialPlatform, socialHandle)
          : buildEnteredPreview(flow, firstName, lastName, selectedCategory, matchDetails, targetPhone, socialPlatform, socialHandle);

    if (!selfConfessionCandidate || !baseRecipientPreview) {
      return baseRecipientPreview;
    }

    return {
      ...baseRecipientPreview,
      statusLabel: "Confession To Yourself",
      statusText: "These details belong to you.",
      note: "This card will go to your Received section.",
    };
  }, [
    directMatch,
    directSearchState,
    firstName,
    flow,
    lastName,
    matchDetails,
    selectedCategory,
    selectedProfile,
    selfConfessionCandidate,
    socialHandle,
    socialPlatform,
    targetPhone,
  ]);
  const selectedSharedProfileOption = sharedProfileOptions.find((option) => option.category === selectedSharedProfileCategory) ?? null;

  useEffect(() => {
    if (selfConfessionCandidate && recipientPreview && !selfPopupDismissed) {
      setShowSelfConfirm(true);
      return;
    }

    if (!selfConfessionCandidate) {
      setShowSelfConfirm(false);
      setSelfPopupDismissed(false);
    }
  }, [recipientPreview, selfConfessionCandidate, selfPopupDismissed]);

  if (sent) {
    return (
      <div className="py-2 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg, rgba(214,185,150,0.28), rgba(255,255,255,0.34))", border: "1px solid rgba(179,148,111,0.3)" }}
          >
            <Send className="w-8 h-8" style={{ color: "#8f6a46" }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#3f2c1d" }}>Confession Sent</h2>
          <p className="text-sm mb-8" style={{ color: "#735a43" }}>{sentMessage}</p>
          <button
            onClick={resetForm}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
          >
            Send Another
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-2 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#3f2c1d" }}>Send a Confession</h1>
        <p className="text-sm mt-1" style={{ color: "#735a43" }}>
          Sending your first confession to someone else is free.
        </p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-xl mb-6 w-full sm:w-fit"
        style={{ background: "rgba(255,251,245,0.76)", border: "1px solid rgba(179,148,111,0.24)" }}
      >
        {(["profile", "phone", "social"] as FlowType[]).map((entryFlow) => (
          <button
            key={entryFlow}
            type="button"
            onClick={() => {
              setFlow(entryFlow);
              setSelectedProfileId(null);
            }}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: flow === entryFlow ? "rgba(143,106,70,0.18)" : "transparent",
              color: flow === entryFlow ? "#8f6a46" : "#735a43",
              border: flow === entryFlow ? "1px solid rgba(179,148,111,0.28)" : "1px solid transparent",
            }}
          >
            {entryFlow === "profile" ? "By details" : entryFlow === "phone" ? "By phone (Recommended)" : "By social"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-medium mb-3" style={{ color: "#735a43" }}>Who is this for?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#9b7c5d" }}>First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#9b7c5d" }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name (optional)"
                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
              />
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {flow === "profile" ? (
            <motion.div key="profile-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
              <h3 className="text-sm font-medium" style={{ color: "#735a43" }}>Where did you meet them?</h3>
              <div className="grid grid-cols-1 gap-2">
                {locationCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setMatchDetails({});
                      setProfileMatches([]);
                      setSelectedProfileId(null);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: selectedCategory === cat.id ? "rgba(143,106,70,0.14)" : "rgba(255,251,245,0.7)",
                      border: `1px solid ${selectedCategory === cat.id ? "rgba(143,106,70,0.35)" : "rgba(179,148,111,0.24)"}`,
                      color: selectedCategory === cat.id ? "#8f6a46" : "#735a43",
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  ref={categoryFieldsRef}
                  className="flex flex-col gap-3 pt-2 border-t"
                  style={{ borderColor: "rgba(179,148,111,0.24)" }}
                >
                  <p className="text-xs" style={{ color: "#9b7c5d" }}>
                    Fill in what you know. Once the required fields are in place, matching registered profiles will appear below.
                  </p>
                  {locationFields[selectedCategory].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9b7c5d" }}>{field.label}</label>
                      {field.options ? (
                        <select
                          value={matchDetails[field.key] || ""}
                          onChange={(e) => setMatchDetails((current) => ({ ...current, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                        >
                          <option value="">Select...</option>
                          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type || "text"}
                          value={matchDetails[field.key] || ""}
                          onChange={(e) => setMatchDetails((current) => ({ ...current, [field.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl text-sm border"
                          style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                        />
                      )}
                    </div>
                  ))}

                  <div className="rounded-2xl border p-4 sm:p-5" style={{ background: "rgba(255,251,245,0.72)", borderColor: "rgba(179,148,111,0.24)" }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-sm font-semibold" style={{ color: "#3f2c1d" }}>Matching people on iConfess</h4>
                        <p className="text-xs mt-1" style={{ color: "#9b7c5d" }}>
                          Select one if you find the exact person. If not, you can continue with the details you entered.
                        </p>
                      </div>
                      {selectedProfileId && (
                        <button
                          type="button"
                          onClick={() => setSelectedProfileId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(255,251,245,0.76)", border: "1px solid rgba(179,148,111,0.24)", color: "#735a43" }}
                        >
                          Clear selection
                        </button>
                      )}
                    </div>

                    {profileSearchState === "idle" && <p className="text-xs" style={{ color: "#735a43" }}>Add the required details for this category to see registered matches.</p>}
                    {profileSearchState === "loading" && <p className="text-xs" style={{ color: "#735a43" }}>Looking for matching profiles...</p>}
                    {profileSearchState === "error" && <p className="text-xs" style={{ color: "#fda4af" }}>{profileSearchError}</p>}
                    {profileSearchState === "ready" && profileMatches.length === 0 && (
                      <p className="text-xs" style={{ color: "#735a43" }}>
                        No registered match showed up yet. You can still send this confession and we&apos;ll keep it pending until the right person registers.
                      </p>
                    )}

                    {profileMatches.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {profileMatches.map((result) => {
                          const selectedSection = getSelectedSection(result, selectedCategory);
                          const isSelected = selectedProfileId === result.id;

                          return (
                            <div
                              key={result.id}
                              className="rounded-2xl border p-4"
                              style={{
                                background: isSelected ? "rgba(143,106,70,0.14)" : "rgba(255,251,245,0.68)",
                                borderColor: isSelected ? "rgba(143,106,70,0.35)" : "rgba(179,148,111,0.24)",
                              }}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}>
                                    {result.name[0]?.toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <p className="font-medium truncate" style={{ color: "#3f2c1d" }}>{result.name}</p>
                                      {result.isShadow && (
                                        <span
                                          className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                                          style={{ background: "rgba(143,106,70,0.14)", color: "#8f6a46" }}
                                        >
                                          Unregistered
                                        </span>
                                      )}
                                    </div>
                                    {result.id === currentUser.id && (
                                      <p className="text-[11px] mt-1" style={{ color: "#8f6a46" }}>Your profile</p>
                                    )}
                                    {selectedSection && <p className="text-sm mt-1 truncate" style={{ color: "#735a43" }}>{getConciseCategorySummary(selectedSection)}</p>}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProfileId(isSelected ? null : result.id)}
                                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-auto"
                                  style={{
                                    background: isSelected
                                      ? "linear-gradient(135deg, rgba(187,247,208,0.92), rgba(134,239,172,0.82))"
                                      : "rgba(143,106,70,0.16)",
                                    border: `1px solid ${isSelected ? "rgba(34,197,94,0.36)" : "rgba(179,148,111,0.25)"}`,
                                    color: isSelected ? "#166534" : "#8f6a46",
                                    boxShadow: isSelected ? "inset 0 1px 0 rgba(255,255,255,0.4)" : "none",
                                  }}
                                >
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {isSelected ? "Selected" : result.id === currentUser.id ? "Select yourself" : "Select this person"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : flow === "phone" ? (
            <motion.div key="phone-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-medium mb-3" style={{ color: "#735a43" }}>Their phone number</h3>
              <PhoneNumberField
                maxLength={10}
                placeholder="9876543210"
                value={targetPhone}
                onChange={setTargetPhone}
                prefixClassName="bg-[rgba(255,251,245,0.84)] border-[rgba(179,148,111,0.24)] text-[#80664c]"
                inputClassName="bg-[rgba(255,251,245,0.84)] border-[rgba(179,148,111,0.24)] text-[#3f2c1d]"
              />
            </motion.div>
          ) : (
            <motion.div key="social-flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm font-medium mb-3" style={{ color: "#735a43" }}>Find them by social media</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["instagram", "snapchat"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSocialPlatform(value)}
                    className="px-4 py-2 rounded-lg text-sm"
                    style={{
                      background: socialPlatform === value ? "rgba(143,106,70,0.16)" : "rgba(255,251,245,0.68)",
                      color: socialPlatform === value ? "#8f6a46" : "#735a43",
                      border: `1px solid ${socialPlatform === value ? "rgba(143,106,70,0.3)" : "rgba(179,148,111,0.24)"}`,
                    }}
                  >
                    {value === "instagram" ? "Instagram" : "Snapchat"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9b7c5d" }} />
                <input
                  type="text"
                  placeholder={socialPlatform === "instagram" ? "instagram_handle" : "snapchat_handle"}
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {recipientPreview && (
          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              background:
                recipientPreview.mode === "matched"
                  ? "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(255,251,245,0.72))"
                  : recipientPreview.mode === "searching"
                    ? "linear-gradient(135deg, rgba(143,106,70,0.12), rgba(255,251,245,0.72))"
                    : "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(255,251,245,0.72))",
              borderColor:
                recipientPreview.mode === "matched"
                  ? "rgba(74,222,128,0.25)"
                  : recipientPreview.mode === "searching"
                    ? "rgba(179,148,111,0.22)"
                    : "rgba(251,191,36,0.22)",
            }}
          >
            <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="min-w-0 text-[11px] uppercase tracking-[0.14em]" style={{ color: "#8f8ab8" }}>
                Recipient Preview
              </p>
              {recipientPreview.statusLabel && (
                <span
                  className="inline-flex max-w-full items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:self-start whitespace-normal break-words leading-tight"
                   style={{
                     background:
                       recipientPreview.mode === "matched"
                        ? "linear-gradient(135deg, rgba(187,247,208,0.92), rgba(134,239,172,0.82))"
                        : recipientPreview.mode === "searching"
                        ? "rgba(143,106,70,0.16)"
                          : "rgba(245,158,11,0.14)",
                     color:
                       recipientPreview.mode === "matched"
                        ? "#166534"
                        : recipientPreview.mode === "searching"
                          ? "#d8b4fe"
                          : "#fde68a",
                     border:
                       recipientPreview.mode === "matched"
                        ? "1px solid rgba(34,197,94,0.36)"
                        : recipientPreview.mode === "searching"
                          ? "1px solid rgba(179,148,111,0.22)"
                          : "1px solid rgba(251,191,36,0.22)",
                     boxShadow:
                       recipientPreview.mode === "matched"
                         ? "inset 0 1px 0 rgba(255,255,255,0.4)"
                         : "none",
                   }}
                 >
                  {recipientPreview.statusLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{
                  background:
                    recipientPreview.mode === "matched"
                      ? "linear-gradient(135deg, #16a34a, #4ade80)"
                      : recipientPreview.mode === "searching"
                        ? "linear-gradient(135deg, #8f6a46, #d7b892)"
                        : "linear-gradient(135deg, #d97706, #fbbf24)",
                }}
              >
                {recipientPreview.title[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate" style={{ color: "#3f2c1d" }}>{recipientPreview.title}</h3>
                <p className="text-sm truncate" style={{ color: "#735a43" }}>{recipientPreview.summary}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "rgba(255,251,245,0.8)", border: "1px solid rgba(179,148,111,0.22)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#3f2c1d" }}>{`${recipientPreview.statusText} ${recipientPreview.note}`}</p>
            </div>
          </div>
        )}

        {selfConfessionCandidate && (
          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{ background: "rgba(143,106,70,0.1)", borderColor: "rgba(143,106,70,0.24)" }}
          >
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#c4b5fd" }}>
                  Confession To Yourself
                </p>
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "#735a43" }}>Select the gender you want to display on this card.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(["MALE", "FEMALE", "OTHER"] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setSelfGenderOverride(gender)}
                      className="px-4 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: selfGenderOverride === gender ? "rgba(143,106,70,0.18)" : "rgba(255,251,245,0.72)",
                        border: `1px solid ${selfGenderOverride === gender ? "rgba(143,106,70,0.32)" : "rgba(179,148,111,0.24)"}`,
                        color: selfGenderOverride === gender ? "#3f2c1d" : "#735a43",
                      }}
                    >
                      {formatGenderLabel(gender)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium" style={{ color: "#735a43" }}>How do you know this person?</h3>
            <p className="text-xs mt-1" style={{ color: "#9b7c5d" }}>
              Choose which of your profile fields connects you to them. These are the details that will be shown to them on the card and also in profile insights.
            </p>
          </div>

          {sharedProfileOptions.length === 0 ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(255,251,245,0.72)", border: "1px solid rgba(212,107,103,0.22)", color: "#d46b67" }}
            >
              Complete at least one of your own profile categories in your profile before sending a confession.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2">
                {sharedProfileOptions.map((option) => {
                  const isSelected = selectedSharedProfileCategory === option.category;

                  return (
                    <button
                      key={option.category}
                      type="button"
                      onClick={() => setSelectedSharedProfileCategory(option.category)}
                      className="rounded-xl px-4 py-3 text-left transition-all"
                      style={{
                        background: isSelected ? "rgba(143,106,70,0.14)" : "rgba(255,251,245,0.7)",
                        border: `1px solid ${isSelected ? "rgba(143,106,70,0.35)" : "rgba(179,148,111,0.24)"}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>{option.label}</p>
                          <p className="text-xs mt-1 truncate" style={{ color: "#735a43" }}>{option.summary}</p>
                        </div>
                        {isSelected && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}>
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedSharedProfileOption && (
                <div
                  className="rounded-xl px-4 py-4"
                  style={{ background: "rgba(255,251,245,0.72)", border: "1px solid rgba(179,148,111,0.24)" }}
                >
                  <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#8f8ab8" }}>
                    Details That Will Be Shared
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {selectedSharedProfileOption.details.map((detail) => (
                      <div key={`${selectedSharedProfileOption.category}-${detail.label}`} className="flex items-center justify-between gap-4">
                        <span className="text-xs" style={{ color: "#735a43" }}>{detail.label}</span>
                        <span className="text-sm text-right" style={{ color: "#3f2c1d" }}>{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-medium mb-3" style={{ color: "#735a43" }}>
            <MessageSquare className="w-4 h-4 inline mr-1.5" />
            Your confession
          </h3>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write what you've always wanted to say..."
            rows={5}
            maxLength={1000}
            className="w-full px-4 py-3 rounded-xl text-sm border resize-none"
            style={{ background: "rgba(255,251,245,0.84)", borderColor: "rgba(179,148,111,0.24)", color: "#3f2c1d" }}
          />
          <p className="text-xs mt-1 text-right" style={{ color: "#9b7c5d" }}>{message.length}/1000</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
        >
          <Send className="w-4 h-4" />
          {loading ? "Sending..." : selfConfessionCandidate ? `Send Confession To Yourself (${sendPriceLabel})` : `Send Confession (${sendPriceLabel})`}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <AnimatePresence>
        {showSelfConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto px-4 pt-24 pb-4 sm:px-6 sm:pt-8 sm:pb-8"
            style={{ background: "rgba(74, 53, 33, 0.22)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              className="mx-auto my-4 w-full max-w-xl rounded-3xl p-6 sm:my-0 sm:p-7"
              style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f1e4d4 100%)", border: "1px solid rgba(179,148,111,0.24)" }}
            >
              <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
                Confirm Confession To Yourself
              </h2>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "#735a43" }}>
                Create your own happiness by sending confessions to yourself on behalf of your loved ones.
              </p>
              <div
                className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "rgba(255,251,245,0.8)", border: "1px solid rgba(179,148,111,0.22)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#3f2c1d" }}>
                  This confession will be treated as a card from you to you.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#3f2c1d" }}>
                  It will appear only in your Received section, stay locked until you unlock it.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#3f2c1d" }}>
                  It will increase your received confession count only, it will not increase your sent confession count to others and will never be considered for a mutual confession.
                </p>
              </div>
              <p className="text-xs mt-4 leading-relaxed" style={{ color: "#735a43" }}>
                If sending this to yourself helps you feel seen, supported, or a little lighter today, that is completely okay.
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowSelfConfirm(false);
                    setSelfPopupDismissed(true);
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ManualPaymentDialog
        open={showPaymentDialog}
        title={selfConfessionCandidate ? "Pay To Send This To Yourself" : "Pay To Send This Confession"}
        description={
          selfConfessionCandidate
            ? `Pay ${formatInr(currentPricing.selfConfession)} and submit the UTR. Your confession-to-yourself card is created now but only delivered after payment review.`
            : `Pay ${formatInr(currentPricing.sendConfession)} and submit the UTR. The confession will only be delivered after payment review.`
        }
        amount={selfConfessionCandidate ? currentPricing.selfConfession : currentPricing.sendConfession}
        qrCodeDataUrl={selfConfessionCandidate ? paymentCatalog.qrCodes.selfConfession : paymentCatalog.qrCodes.sendConfession}
        pending={loading}
        submitLabel="Submit Send Payment"
        onClose={() => setShowPaymentDialog(false)}
        onSubmit={handleManualPaymentSubmit}
      />
    </div>
  );
}
