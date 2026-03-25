"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AtSign, Lock, Phone, Save, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { locationCategories, locationFields, type LocationCategory } from "@/lib/matching";
import { maskPhone } from "@/lib/utils";

type UserProfile = {
  id: string;
  name: string;
  phone: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  primaryCategory: LocationCategory;
  username: string | null;
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
    buildingName: string;
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
            fullName: user.college.fullName,
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
            fullName: user.school.fullName,
          },
        }
      : {}),
    ...(user.workplace
      ? {
          WORKPLACE: {
            companyName: user.workplace.companyName,
            department: user.workplace.department,
            city: user.workplace.city,
            buildingName: user.workplace.buildingName,
            fullName: user.workplace.fullName,
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
            fullName: user.gym.fullName,
          },
        }
      : {}),
    ...(user.neighbourhood
      ? {
          NEIGHBOURHOOD: {
            state: user.neighbourhood.state,
            city: user.neighbourhood.city,
            pinCode: user.neighbourhood.pinCode,
            premisesName: user.neighbourhood.premisesName,
            fullName: user.neighbourhood.fullName,
          },
        }
      : {}),
  };
}

export default function ProfilePage({ user }: { user: UserProfile }) {
  const shortId = user.id.slice(-8).toUpperCase();
  const initialSelectedCategories = useMemo(() => getSelectedCategories(user), [user]);

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [instagramHandle, setInstagramHandle] = useState(user.instagramHandle ?? "NA Handle");
  const [snapchatHandle, setSnapchatHandle] = useState(user.snapchatHandle ?? "NA Handle");
  const [primaryCategory, setPrimaryCategory] = useState<LocationCategory>(user.primaryCategory);
  const [selectedCategories, setSelectedCategories] = useState<LocationCategory[]>(initialSelectedCategories);
  const [profileDetailsByCategory, setProfileDetailsByCategory] = useState<
    Partial<Record<LocationCategory, Record<string, string>>>
  >(getProfileDetailsByCategory(user));
  const [saving, setSaving] = useState(false);

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
          username,
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-bold" style={{ color: "#f0eeff" }}>Profile</h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>
          Edit your public profile and all the places where people may know you.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
        className="glass rounded-2xl p-6 mb-5 flex items-center gap-5"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #c084fc)" }}
        >
          {name[0]?.toUpperCase() ?? "I"}
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#f0eeff" }}>{name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{
                background: "rgba(124,58,237,0.15)",
                color: "#c084fc",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              #{shortId}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(244,114,182,0.18)", color: "#f472b6" }}
            >
              Primary: {locationCategories.find((item) => item.id === primaryCategory)?.label}
            </span>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4" style={{ color: "#c084fc" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#f0eeff" }}>Identity</h3>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
              required
            />
            <input
              type="text"
              value={user.gender.charAt(0) + user.gender.slice(1).toLowerCase()}
              disabled
              className="w-full px-4 py-2.5 rounded-xl text-sm border opacity-70"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Username"
              className="w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
              required
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "#4a4870" }}>
            Gender is fixed after signup and cannot be changed from profile editing.
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AtSign className="w-4 h-4" style={{ color: "#c084fc" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#f0eeff" }}>Social Handles</h3>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              placeholder="Instagram handle or NA Handle"
              className="w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
              required
            />
            <input
              type="text"
              value={snapchatHandle}
              onChange={(e) => setSnapchatHandle(e.target.value)}
              placeholder="Snapchat handle or NA Handle"
              className="w-full px-4 py-2.5 rounded-xl text-sm border"
              style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
              required
            />
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4" style={{ color: "#c084fc" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#f0eeff" }}>Phone</h3>
          </div>
          <input
            type="text"
            value={maskPhone(user.phone)}
            disabled
            className="w-full px-4 py-2.5 rounded-xl text-sm border opacity-70"
            style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
          />
          <p className="text-xs mt-2" style={{ color: "#4a4870" }}>
            Phone changes require OTP verification, so this field is not directly editable here.
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: "#f0eeff" }}>
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
                    background: isSelected ? "rgba(124,58,237,0.15)" : "rgba(30,30,63,0.3)",
                    border: `1px solid ${isSelected ? "rgba(192,132,252,0.4)" : "#1e1e3f"}`,
                    color: isSelected ? "#c084fc" : "#9b98c8",
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span className="flex-1">{cat.label}</span>
                  {isSelected && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: primaryCategory === cat.id ? "rgba(244,114,182,0.18)" : "rgba(124,58,237,0.18)",
                        color: primaryCategory === cat.id ? "#f472b6" : "#c084fc",
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
            <p className="text-xs" style={{ color: "#4a4870" }}>
              Keep one main category, then add any other valid places where people can identify you.
            </p>
            {selectedCategories.map((category) => (
              <div
                key={category}
                className="rounded-xl p-4"
                style={{ background: "rgba(30,30,63,0.22)", border: "1px solid #1e1e3f" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: "#f0eeff" }}>
                    {locationCategories.find((item) => item.id === category)?.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPrimaryCategory(category)}
                    className="text-[11px] px-2 py-1 rounded-full"
                    style={{
                      background: primaryCategory === category ? "rgba(244,114,182,0.18)" : "rgba(124,58,237,0.18)",
                      color: primaryCategory === category ? "#f472b6" : "#c084fc",
                    }}
                  >
                    {primaryCategory === category ? "Primary" : "Set Primary"}
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {locationFields[category].map((field) => (
                    <div key={`${category}-${field.key}`}>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "#9b98c8" }}>
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
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
                          required
                        >
                          <option value="">Select…</option>
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
                          style={{ background: "rgba(30,30,63,0.5)", borderColor: "#1e1e3f", color: "#f0eeff" }}
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
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="rounded-2xl p-4 flex items-start gap-3 mt-4"
        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
      >
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c084fc" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#9b98c8" }}>
          Search matching updates as you edit this profile. Your main category helps rank how your
          profile is understood, but all selected places remain searchable.
        </p>
      </motion.div>

      <div
        className="rounded-2xl p-4 flex items-start gap-3 mt-4"
        style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.15)" }}
      >
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#f472b6" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#9b98c8" }}>
          Username and social handles must stay unique. If you use `NA Handle`, it is treated as not
          available and will not block other users.
        </p>
      </div>
    </div>
  );
}
