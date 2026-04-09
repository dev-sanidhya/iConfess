"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AtSign, Lock, Pencil, Phone, PlusCircle, Save, Shield, User, X } from "lucide-react";
import ManualPaymentDialog from "@/components/ManualPaymentDialog";
import { toast } from "sonner";
import { locationCategories, locationFields, type LocationCategory } from "@/lib/matching";
import { getErrorMessage, getResponseErrorMessage, maskPhone } from "@/lib/utils";
import { formatInr, pricing } from "@/lib/pricing";

type UserProfile = {
  id: string;
  name: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  primaryCategory: LocationCategory;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  college: {
    collegeName: string;
    pinCode: string;
    course: string;
    branch: string;
    yearOfPassing: number;
    section: string;
    fullName: string;
  } | null;
  school: {
    schoolName: string;
    pinCode: string;
    board: string;
    yearOfCompletion: number;
    section: string;
    fullName: string;
  } | null;
  workplace: {
    companyName: string;
    department: string;
    city: string;
    fullName: string;
  } | null;
  gym: {
    gymName: string;
    city: string;
    pinCode: string;
    timing: string;
    fullName: string;
  } | null;
  neighbourhood: {
    state: string;
    city: string;
    pinCode: string;
    homeNumber: string;
    premisesName: string;
    fullName: string;
  } | null;
};

function getSelectedCategories(user: UserProfile): LocationCategory[] {
  const selected: LocationCategory[] = [];
  if (user.college) selected.push("COLLEGE");
  if (user.school) selected.push("SCHOOL");
  if (user.workplace) selected.push("WORKPLACE");
  if (user.gym) selected.push("GYM");
  if (user.neighbourhood) selected.push("NEIGHBOURHOOD");
  return selected;
}

function getProfileDetailsByCategory(user: UserProfile): Partial<Record<LocationCategory, Record<string, string>>> {
  return {
    ...(user.college
      ? {
          COLLEGE: {
            collegeName: user.college.collegeName,
            pinCode: user.college.pinCode,
            course: user.college.course,
            branch: user.college.branch,
            yearOfPassing: String(user.college.yearOfPassing),
            section: user.college.section,
          },
        }
      : {}),
    ...(user.school
      ? {
          SCHOOL: {
            schoolName: user.school.schoolName,
            pinCode: user.school.pinCode,
            board: user.school.board,
            yearOfCompletion: String(user.school.yearOfCompletion),
            section: user.school.section,
          },
        }
      : {}),
    ...(user.workplace
      ? {
          WORKPLACE: {
            companyName: user.workplace.companyName,
            department: user.workplace.department,
            city: user.workplace.city,
          },
        }
      : {}),
    ...(user.gym
      ? {
          GYM: {
            gymName: user.gym.gymName,
            city: user.gym.city,
            pinCode: user.gym.pinCode,
            timing: user.gym.timing,
          },
        }
      : {}),
    ...(user.neighbourhood
      ? {
          NEIGHBOURHOOD: {
            state: user.neighbourhood.state,
            city: user.neighbourhood.city,
            pinCode: user.neighbourhood.pinCode,
            homeNumber: user.neighbourhood.homeNumber,
            premisesName: user.neighbourhood.premisesName,
          },
        }
      : {}),
  };
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function SummaryCard({
  title,
  values,
}: {
  title: string;
  values: { label: string; value: string }[];
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-3" style={{ color: "#3f2c1d" }}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {values.map((item) => (
          <div key={`${title}-${item.label}`}>
            <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#9b7c5d" }}>
              {item.label}
            </p>
            <p className="text-sm mt-1" style={{ color: "#4a3521" }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactPlaceCard({
  title,
  summary,
  meta,
  isPrimary,
}: {
  title: string;
  summary: string;
  meta: string[];
  isPrimary: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm" style={{ color: "#3f2c1d" }}>{title}</h3>
          <p className="text-base sm:text-lg mt-2 leading-snug break-words" style={{ color: "#735a43" }}>
            {summary}
          </p>
        </div>
        <span
          className="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{
            background: isPrimary ? "rgba(198,145,85,0.16)" : "rgba(143,106,70,0.12)",
            color: isPrimary ? "#9f6c31" : "#8f6a46",
          }}
        >
          {isPrimary ? "Primary" : "Additional"}
        </span>
      </div>

      {meta.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {meta.map((item) => (
            <span
              key={`${title}-${item}`}
              className="text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(255,251,245,0.84)",
                border: "1px solid rgba(184,159,126,0.22)",
                color: "#8c7257",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ user }: { user: UserProfile }) {
  const shortId = user.id.slice(-8).toUpperCase();
  const initialSelectedCategories = useMemo(() => getSelectedCategories(user), [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [instagramHandle, setInstagramHandle] = useState(user.instagramHandle ?? "NA Handle");
  const [snapchatHandle, setSnapchatHandle] = useState(user.snapchatHandle ?? "NA Handle");
  const [primaryCategory, setPrimaryCategory] = useState<LocationCategory>(user.primaryCategory);
  const [selectedCategories, setSelectedCategories] = useState<LocationCategory[]>(initialSelectedCategories);
  const [profileDetailsByCategory, setProfileDetailsByCategory] = useState<
    Partial<Record<LocationCategory, Record<string, string>>>
  >(getProfileDetailsByCategory(user));
  const [saving, setSaving] = useState(false);
  const [pendingSelfClaimId, setPendingSelfClaimId] = useState<string | null>(null);
  const [showSelfClaimPaymentDialog, setShowSelfClaimPaymentDialog] = useState(false);
  const [processingSelfClaim, setProcessingSelfClaim] = useState(false);
  const missingCategories = useMemo(
    () => locationCategories.filter((category) => !selectedCategories.includes(category.id)),
    [selectedCategories]
  );

  const summarySections = useMemo(() => {
    const sections: { title: string; values: { label: string; value: string }[] }[] = [
      {
        title: "Identity",
        values: [
          { label: "Full Name", value: name },
          { label: "Gender", value: toLabel(user.gender) },
          { label: "Phone", value: maskPhone(user.phone) },
        ],
      },
      {
        title: "Social Handles",
        values: [
          { label: "Instagram", value: instagramHandle || "NA" },
          { label: "Snapchat", value: snapchatHandle || "NA" },
        ],
      },
    ];

    selectedCategories.forEach((category) => {
      const details = profileDetailsByCategory[category] ?? {};
      const values = locationFields[category]
        .map((field) => ({
          label: field.label,
          value: details[field.key] || "Not provided",
        }));

      sections.push({
        title: locationCategories.find((item) => item.id === category)?.label ?? category,
        values: [
          { label: "Role", value: primaryCategory === category ? "Primary" : "Additional" },
          ...values,
        ],
      });
    });

    return sections;
  }, [instagramHandle, name, primaryCategory, profileDetailsByCategory, selectedCategories, snapchatHandle, user.gender, user.phone]);

  const compactPlaceSections = useMemo(() => {
    return selectedCategories.map((category) => {
      const details = profileDetailsByCategory[category] ?? {};
      const mainPartsByCategory: Record<LocationCategory, string[]> = {
        COLLEGE: [details.branch, details.section, details.yearOfPassing, details.collegeName],
        SCHOOL: [details.yearOfCompletion, details.schoolName],
        WORKPLACE: [details.companyName, details.city],
        GYM: [details.gymName, details.pinCode, details.timing],
        NEIGHBOURHOOD: [details.homeNumber, details.premisesName, details.city, details.state, details.pinCode],
      };
      const metaPartsByCategory: Record<LocationCategory, string[]> = {
        COLLEGE: [],
        SCHOOL: [],
        WORKPLACE: [],
        GYM: [],
        NEIGHBOURHOOD: [],
      };

      return {
        title: locationCategories.find((item) => item.id === category)?.label ?? category,
        summary: mainPartsByCategory[category].filter(Boolean).join(" · ") || "Details not provided",
        meta: metaPartsByCategory[category].filter(Boolean),
        isPrimary: primaryCategory === category,
      };
    });
  }, [primaryCategory, profileDetailsByCategory, selectedCategories]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      toast.error("Select at least one profile category");
      return;
    }
    if (!selectedCategories.includes(primaryCategory)) {
      toast.error("Choose a valid primary category");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          instagramHandle,
          snapchatHandle,
          primaryCategory,
          selectedCategories,
          profileDetailsByCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Profile updated");
      if (Array.isArray(data.convertedIds) && data.convertedIds.length > 0) {
        toast.success(`${data.convertedIds.length} pending confession${data.convertedIds.length === 1 ? "" : "s"} moved into your received inbox as Confession to Yourself.`);
      }
      if (Array.isArray(data.paymentRequiredIds) && data.paymentRequiredIds.length > 0) {
        setPendingSelfClaimId(data.paymentRequiredIds[0]);
      }
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSelfClaimPayment(transactionReference: string) {
    if (!pendingSelfClaimId) return;

    setProcessingSelfClaim(true);
    try {
      const res = await fetch("/api/payments/self-confession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confessionId: pendingSelfClaimId, transactionReference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(getResponseErrorMessage(data, "Failed to submit payment"));
      toast.success("Payment submitted for review.");
      setShowSelfClaimPaymentDialog(false);
      setPendingSelfClaimId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to submit payment"));
    } finally {
      setProcessingSelfClaim(false);
    }
  }

  return (
    <div className="py-2 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#3f2c1d" }}>Profile</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0"
            style={{
              background: isEditing ? "rgba(198,145,85,0.14)" : "rgba(143,106,70,0.12)",
              border: `1px solid ${isEditing ? "rgba(198,145,85,0.22)" : "rgba(179,148,111,0.24)"}`,
              color: isEditing ? "#9f6c31" : "#8f6a46",
            }}
          >
            {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {isEditing ? "Close Edit" : "Edit"}
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
        className="glass rounded-2xl p-5 sm:p-6 mb-5 flex items-center gap-4 sm:gap-5"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
        >
          {name[0]?.toUpperCase() ?? "I"}
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#3f2c1d" }}>{name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: "rgba(143,106,70,0.12)",
                color: "#8f6a46",
                border: "1px solid rgba(179,148,111,0.24)",
              }}
            >
              #{shortId}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(198,145,85,0.16)", color: "#9f6c31" }}
            >
              Primary: {locationCategories.find((item) => item.id === primaryCategory)?.label}
            </span>
          </div>
        </div>
      </motion.div>

      {!isEditing ? (
        <div className="flex flex-col gap-4">
          {summarySections.slice(0, 2).map((section) => (
            <SummaryCard key={section.title} title={section.title} values={section.values} />
          ))}
          {compactPlaceSections.map((section) => (
            <CompactPlaceCard
              key={section.title}
              title={section.title}
              summary={section.summary}
              meta={section.meta}
              isPrimary={section.isPrimary}
            />
          ))}

          {missingCategories.length > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.5 }}
              onClick={() => setIsEditing(true)}
              className="w-full rounded-2xl p-4 sm:p-5 text-left transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(214,185,150,0.22) 0%, rgba(255,251,245,0.86) 100%)",
                border: "1px solid rgba(179,148,111,0.24)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <PlusCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#8f6a46" }} />
                    <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "#9b7c5d" }}>
                      Complete Your Profile
                    </p>
                  </div>
                  <p className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: "#3f2c1d" }}>
                    Add your remaining {missingCategories.length === 1 ? "field" : "fields"}:
                    {" "}
                    <span style={{ color: "#8f6a46" }}>
                      {missingCategories.map((category) => category.label).join(", ")}
                    </span>
                  </p>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "#9b7c5d" }}>
                    Complete all fields, even past details, to make your profile easier to find.
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2 flex-shrink-0"
                  style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}
                >
                  <span className="text-xs font-medium hidden sm:inline">Add details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.button>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(179,148,111,0.24)" }}
          >
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#8f6a46" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#735a43" }}>
              Search matching updates as you edit this profile. Your main category helps rank how your profile is understood, but all selected places remain searchable.
            </p>
          </motion.div>

          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: "rgba(255,248,240,0.88)", border: "1px solid rgba(198,145,85,0.22)" }}
          >
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#9f6c31" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#735a43" }}>
              Social handles must stay unique. Gender is fixed after signup, and phone changes must go through OTP verification.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4" style={{ color: "#8f6a46" }} />
              <h3 className="font-semibold text-sm" style={{ color: "#3f2c1d" }}>Identity</h3>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-xl text-sm border"
                style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                required
              />
              <input
                type="text"
                value={toLabel(user.gender)}
                disabled
                className="w-full px-4 py-2.5 rounded-xl text-sm border opacity-70"
                style={{ background: "rgba(255,248,240,0.84)", borderColor: "rgba(184,159,126,0.3)", color: "#735a43" }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "#9b7c5d" }}>
              Your sign-in phone number and gender cannot be changed directly from profile editing.
            </p>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AtSign className="w-4 h-4" style={{ color: "#8f6a46" }} />
              <h3 className="font-semibold text-sm" style={{ color: "#3f2c1d" }}>Social Handles</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="Instagram handle or NA"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#9b7c5d" }}>
                  Snapchat
                </label>
                <input
                  type="text"
                  value={snapchatHandle}
                  onChange={(e) => setSnapchatHandle(e.target.value)}
                  placeholder="Snapchat handle or NA"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border"
                  style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                  required
                />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-4 h-4" style={{ color: "#8f6a46" }} />
              <h3 className="font-semibold text-sm" style={{ color: "#3f2c1d" }}>Phone</h3>
            </div>
            <input
              type="text"
              value={maskPhone(user.phone)}
              disabled
              className="w-full px-4 py-2.5 rounded-xl text-sm border opacity-70"
              style={{ background: "rgba(255,248,240,0.84)", borderColor: "rgba(184,159,126,0.3)", color: "#735a43" }}
            />
            <p className="text-xs mt-2" style={{ color: "#9b7c5d" }}>
              Phone changes require OTP verification, so this field is not directly editable here.
            </p>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4" style={{ color: "#3f2c1d" }}>
              Categories And Places
            </h3>
            <div className="grid grid-cols-1 gap-2 mb-4">
              {locationCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategories((current) =>
                        current.includes(cat.id)
                          ? current.filter((item) => item !== cat.id)
                          : [...current, cat.id]
                      );
                      setProfileDetailsByCategory((current) => ({
                        ...current,
                        [cat.id]: current[cat.id] ?? {},
                      }));
                      setPrimaryCategory((current) => {
                        if (current === cat.id && isSelected) {
                          return selectedCategories.find((item) => item !== cat.id) ?? "COLLEGE";
                        }
                        if (!selectedCategories.includes(cat.id) && selectedCategories.length === 0) {
                          return cat.id;
                        }
                        return current;
                      });
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: isSelected ? "rgba(143,106,70,0.12)" : "rgba(255,251,245,0.84)",
                      border: `1px solid ${isSelected ? "rgba(179,148,111,0.32)" : "rgba(184,159,126,0.22)"}`,
                      color: isSelected ? "#8f6a46" : "#8c7257",
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span className="flex-1">{cat.label}</span>
                    {isSelected && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: primaryCategory === cat.id ? "rgba(198,145,85,0.16)" : "rgba(143,106,70,0.12)",
                          color: primaryCategory === cat.id ? "#9f6c31" : "#8f6a46",
                        }}
                      >
                        {primaryCategory === cat.id ? "Primary" : "Added"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: "#9b7c5d" }}>
                Your full name is stored once from your identity profile and reused across all selected places.
              </p>
              {selectedCategories.map((category) => (
                <div
                  key={category}
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium" style={{ color: "#3f2c1d" }}>
                      {locationCategories.find((item) => item.id === category)?.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPrimaryCategory(category)}
                      className="text-[11px] px-2 py-1 rounded-full"
                      style={{
                        background: primaryCategory === category ? "rgba(198,145,85,0.16)" : "rgba(143,106,70,0.12)",
                        color: primaryCategory === category ? "#9f6c31" : "#8f6a46",
                      }}
                    >
                      {primaryCategory === category ? "Primary" : "Set Primary"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {locationFields[category].map((field) => (
                      <div key={`${category}-${field.key}`}>
                        <label className="text-xs font-medium mb-1 block" style={{ color: "#9b7c5d" }}>
                          {field.label}
                        </label>
                        {field.options ? (
                          <select
                            value={profileDetailsByCategory[category]?.[field.key] || ""}
                            onChange={(e) =>
                              setProfileDetailsByCategory((current) => ({
                                ...current,
                                [category]: {
                                  ...(current[category] ?? {}),
                                  [field.key]: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl text-sm border"
                            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                            required
                          >
                            <option value="">Select...</option>
                            {field.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || "text"}
                            value={profileDetailsByCategory[category]?.[field.key] || ""}
                            onChange={(e) =>
                              setProfileDetailsByCategory((current) => ({
                                ...current,
                                [category]: {
                                  ...(current[category] ?? {}),
                                  [field.key]: e.target.value,
                                },
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl text-sm border"
                            style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                            required
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #8f6a46 0%, #d7b892 100%)" }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}
      <AnimatePresence>
        {pendingSelfClaimId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto px-4 pt-24 pb-4 sm:px-6 sm:pt-8 sm:pb-8"
            style={{ background: "rgba(102, 74, 44, 0.34)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              className="mx-auto my-4 w-full max-w-xl rounded-3xl p-6 sm:my-0 sm:p-7"
              style={{ background: "linear-gradient(180deg, #fffaf3 0%, #f3e6d7 100%)", border: "1px solid rgba(184,159,126,0.3)" }}
            >
              <h2 className="text-xl font-semibold" style={{ color: "#3f2c1d" }}>
                Pay To Claim This As Yours
              </h2>
              <div
                className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: "rgba(255,251,245,0.88)", border: "1px solid rgba(184,159,126,0.22)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  These details match one of your pending confession cards, so this card is now treated as a Confession to Yourself.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  This specific card was originally your free first confession to someone else, so it cannot be claimed as yours until you pay {formatInr(pricing.sendConfession)}.
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#4a3521" }}>
                  Once paid, it will move into your Received section, stay locked like a normal received card, and stop counting as a confession sent to others.
                </p>
              </div>
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingSelfClaimId(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(255,251,245,0.9)", border: "1px solid rgba(184,159,126,0.3)", color: "#8c7257" }}
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => setShowSelfClaimPaymentDialog(true)}
                  disabled={processingSelfClaim}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #8f6a46, #d7b892)" }}
                >
                  {processingSelfClaim ? "Processing..." : `Continue To Payment (${formatInr(pricing.sendConfession)})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ManualPaymentDialog
        open={showSelfClaimPaymentDialog && Boolean(pendingSelfClaimId)}
        title="Pay To Claim This As Yours"
        description={`Pay ${formatInr(pricing.selfConfession)} and submit the UTR so staff can convert this card into a Confession to Yourself after review.`}
        amount={pricing.selfConfession}
        pending={processingSelfClaim}
        submitLabel="Submit Self-Claim Payment"
        onClose={() => setShowSelfClaimPaymentDialog(false)}
        onSubmit={handleSelfClaimPayment}
      />
    </div>
  );
}
