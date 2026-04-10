"use client";

import { useState } from "react";
import { toast } from "sonner";

type VerificationRow = {
  id: string;
  platform: "INSTAGRAM" | "SNAPCHAT";
  submittedHandle: string;
  profileUrl: string;
  userName: string;
  userIdCode: string;
};

export default function SocialOwnershipVerificationPanel({
  title,
  description,
  requests,
}: {
  title: string;
  description: string;
  requests: VerificationRow[];
}) {
  const [queue, setQueue] = useState(requests);
  const [codesById, setCodesById] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function decide(requestId: string, action: "accept" | "reject") {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/internal/social-ownership/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.removeFromQueue) {
          setQueue((current) => current.filter((request) => request.id !== requestId));
          setCodesById((current) => {
            const next = { ...current };
            delete next[requestId];
            return next;
          });
        }
        throw new Error(data.error ?? "Failed to update verification request");
      }

      setQueue((current) => current.filter((request) => request.id !== requestId));
      setCodesById((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      toast.success(action === "accept" ? "Ownership verified." : "Request rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update verification request");
    } finally {
      setProcessingId(null);
    }
  }

  function handleCodeChange(request: VerificationRow, nextCode: string) {
    const normalizedCode = nextCode.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
    setCodesById((current) => ({ ...current, [request.id]: normalizedCode }));

    if (normalizedCode.length !== 6 || processingId) {
      return;
    }

    void decide(request.id, normalizedCode === request.userIdCode ? "accept" : "reject");
  }

  return (
    <div className="space-y-6 py-6">
      <section className="glass rounded-3xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#3f2c1d" }}>{title}</h1>
        <p className="text-sm" style={{ color: "#735a43" }}>{description}</p>
      </section>

      <section className="glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr style={{ color: "#9b7c5d" }}>
              <th className="text-left py-3">Platform</th>
              <th className="text-left py-3">Social Handle</th>
              <th className="text-left py-3">User</th>
              <th className="text-left py-3">User ID</th>
              <th className="text-left py-3">Paste Code</th>
              <th className="text-left py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((request) => {
              const code = codesById[request.id] ?? "";
              const isBusy = processingId === request.id;

              return (
                <tr
                  key={request.id}
                  className="border-t"
                  style={{ borderColor: "rgba(184,159,126,0.22)", color: "#3f2c1d" }}
                >
                  <td className="py-3">{request.platform === "INSTAGRAM" ? "Instagram" : "Snapchat"}</td>
                  <td className="py-3">
                    <a
                      href={request.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                      style={{ color: "#8f6a46" }}
                    >
                      @{request.submittedHandle}
                    </a>
                  </td>
                  <td className="py-3">{request.userName}</td>
                  <td className="py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-mono"
                      style={{ background: "rgba(143,106,70,0.12)", color: "#8f6a46" }}
                    >
                      {request.userIdCode}
                    </span>
                  </td>
                  <td className="py-3">
                    <input
                      type="text"
                      value={code}
                      onChange={(event) => handleCodeChange(request, event.target.value)}
                      placeholder="6-char code"
                      className="w-36 px-4 py-2.5 rounded-xl text-sm border font-mono"
                      style={{ background: "rgba(255,251,245,0.92)", borderColor: "rgba(184,159,126,0.35)", color: "#3f2c1d" }}
                    />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void decide(request.id, "accept")}
                        disabled={isBusy}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void decide(request.id, "reject")}
                        disabled={isBusy}
                        className="px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-60"
                        style={{ background: "rgba(255,251,245,0.92)", border: "1px solid rgba(184,159,126,0.3)", color: "#8c7257" }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {queue.length === 0 && (
          <p className="text-sm mt-4" style={{ color: "#9b7c5d" }}>
            No pending ownership verification requests right now.
          </p>
        )}
      </section>
    </div>
  );
}
