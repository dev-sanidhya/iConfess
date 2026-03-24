"use client";

import { motion } from "framer-motion";
import { User, Phone, GraduationCap, Briefcase, Dumbbell, Home, Shield } from "lucide-react";
import { maskPhone } from "@/lib/utils";

type UserProfile = {
  id: string;
  name: string;
  phone: string;
  college: { collegeName: string; course: string; branch: string; yearOfPassing: number; section: string } | null;
  workplace: { companyName: string; department: string; city: string } | null;
  gym: { gymName: string; city: string } | null;
  neighbourhood: { premisesName: string; city: string } | null;
};

function ProfileSection({ icon: Icon, label, details }: {
  icon: React.ElementType;
  label: string;
  details: [string, string][];
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          <Icon className="w-4 h-4" style={{ color: "#c084fc" }} />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: "#f0eeff" }}>{label}</h3>
      </div>
      <div className="flex flex-col gap-2">
        {details.map(([key, val]) => (
          <div key={key} className="flex justify-between">
            <span className="text-xs" style={{ color: "#4a4870" }}>{key}</span>
            <span className="text-xs font-medium" style={{ color: "#9b98c8" }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage({ user }: { user: UserProfile }) {
  const shortId = user.id.slice(-8).toUpperCase();

  return (
    <div className="py-2 max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold" style={{ color: "#f0eeff" }}>Profile</h1>
        <p className="text-sm mt-1" style={{ color: "#9b98c8" }}>Your public profile on iConfess.</p>
      </motion.div>

      {/* Avatar + identity */}
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
          {user.name[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#f0eeff" }}>{user.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: "rgba(124,58,237,0.15)", color: "#c084fc", border: "1px solid rgba(124,58,237,0.2)" }}>
              #{shortId}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Profile sections */}
      <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <ProfileSection
            icon={Phone}
            label="Contact"
            details={[["Phone", maskPhone(user.phone)]]}
          />
        </motion.div>

        {user.college && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
            <ProfileSection
              icon={GraduationCap}
              label="College"
              details={[
                ["College", user.college.collegeName],
                ["Course", user.college.course],
                ["Branch", user.college.branch],
                ["Year of Passing", String(user.college.yearOfPassing)],
                ["Section", user.college.section],
              ]}
            />
          </motion.div>
        )}

        {user.workplace && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <ProfileSection
              icon={Briefcase}
              label="Workplace"
              details={[
                ["Company", user.workplace.companyName],
                ["Department", user.workplace.department],
                ["City", user.workplace.city],
              ]}
            />
          </motion.div>
        )}

        {user.gym && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
            <ProfileSection
              icon={Dumbbell}
              label="Gym"
              details={[["Gym", user.gym.gymName], ["City", user.gym.city]]}
            />
          </motion.div>
        )}

        {user.neighbourhood && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <ProfileSection
              icon={Home}
              label="Neighbourhood"
              details={[["Premises", user.neighbourhood.premisesName], ["City", user.neighbourhood.city]]}
            />
          </motion.div>
        )}

        {/* Privacy note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}
        >
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c084fc" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#9b98c8" }}>
            Your phone number is never shared publicly. Other users can only see your name and the
            general context of your locations when searching. Identity is only revealed after mutual
            confession consent from both parties.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
