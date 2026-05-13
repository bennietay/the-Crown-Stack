import { KeyRound, LockKeyhole, MailPlus, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { BentoTile } from "../../components/BentoTile";
import type { AccessInvite, AccessUser, UserRole } from "../../types/tenant";
import type { SubscriptionTier } from "../../types/subscription";

interface LoginAccessManagementProps {
  users: AccessUser[];
  invites: AccessInvite[];
}

export function LoginAccessManagement({ users, invites }: LoginAccessManagementProps) {
  const [inviteRows, setInviteRows] = useState(invites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [inviteTier, setInviteTier] = useState<SubscriptionTier>("ignite");
  const [accessEmail, setAccessEmail] = useState("");
  const [loginPreview, setLoginPreview] = useState("Enter an account email to validate RBAC.");
  const activeUsers = users.filter((user) => user.status === "active").length;
  const pendingInvites = inviteRows.filter((invite) => invite.status === "pending").length;
  const mfaCoverage = Math.round(
    (users.filter((user) => user.mfaEnabled).length / Math.max(users.length, 1)) * 100
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
          Login Access
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Identity and permissions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-crown-mist">
          Control who can enter each tenant, what they can touch, and how securely they authenticate.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <BentoTile title="Login Preview" eyebrow="Supabase Auth" className="md:col-span-2">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm text-crown-mist">Email</span>
              <input
                value={accessEmail}
                onChange={(event) => setAccessEmail(event.target.value)}
                placeholder="Email address"
                className="w-full rounded-lg border border-white/10 bg-crown-ink p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              />
            </label>
            <button
              onClick={() => {
                const user = users.find((item) => item.email.toLowerCase() === accessEmail.trim().toLowerCase());
                const invite = inviteRows.find((item) => item.email.toLowerCase() === accessEmail.trim().toLowerCase());

                if (user) {
                  setLoginPreview(
                    `${user.displayName} resolves as ${user.role} on ${user.tier}. Status: ${user.status}. MFA: ${user.mfaEnabled ? "enabled" : "required"}.`
                  );
                  return;
                }

                if (invite) {
                  setLoginPreview(`Invite found for ${invite.email}. Role: ${invite.role}. Status: ${invite.status}. Expires ${new Date(invite.expiresAt).toLocaleDateString()}.`);
                  return;
                }

                setLoginPreview("No user or pending invite found for that email.");
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 font-semibold text-crown-navy"
            >
              <KeyRound size={18} />
              Validate Access
            </button>
            <p className="text-xs text-crown-mist">{loginPreview}</p>
          </div>
        </BentoTile>

        <BentoTile title="Access Health" eyebrow="Security" className="md:col-span-2 lg:col-span-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={<UserCog />} label="Active users" value={String(activeUsers)} />
            <Metric icon={<MailPlus />} label="Pending invites" value={String(pendingInvites)} />
            <Metric icon={<ShieldCheck />} label="MFA coverage" value={`${mfaCoverage}%`} />
          </div>
          <div className="mt-4 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4 text-sm leading-6 text-crown-champagne">
            Recommended enterprise policy: enforce MFA for Superadmin and tenant admins, require
            invite-based onboarding, and suspend access automatically when billing becomes past due.
          </div>
        </BentoTile>

        <BentoTile title="Invite User" eyebrow="Seat Provisioning" className="md:col-span-2">
          <div className="space-y-3">
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Invite email"
              className="w-full rounded-lg border border-white/10 bg-crown-ink p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
            />
            <div className="grid grid-cols-2 gap-3">
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as UserRole)} className="rounded-lg border border-white/10 bg-crown-ink p-3 text-sm text-white outline-none">
                <option value="member">member</option>
                <option value="new_joiner">new_joiner</option>
                <option value="leader">leader</option>
                <option value="admin">admin</option>
              </select>
              <select value={inviteTier} onChange={(event) => setInviteTier(event.target.value as SubscriptionTier)} className="rounded-lg border border-white/10 bg-crown-ink p-3 text-sm text-white outline-none">
                <option value="ignite">Basic</option>
                <option value="ascent">Growth</option>
                <option value="empire">Pro</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (!inviteEmail.trim()) return;
                setInviteRows((current) => [
                  {
                    id: `invite-${Date.now()}`,
                    email: inviteEmail.trim(),
                    role: inviteRole,
                    tier: inviteTier,
                    status: "pending",
                    invitedBy: "Current admin",
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                  },
                  ...current
                ]);
                setInviteEmail("");
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-crown-gold/30 px-4 font-semibold text-crown-champagne"
            >
              <MailPlus size={18} />
              Create Invite
            </button>
          </div>
        </BentoTile>

        <BentoTile title="Users and Roles" eyebrow="RBAC" className="md:col-span-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-crown-mist">
                <tr className="border-b border-white/10">
                  <th className="py-3 font-medium">User</th>
                  <th className="py-3 font-medium">Role</th>
                  <th className="py-3 font-medium">Tier</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">MFA</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 text-white">
                    <td className="py-4">
                      <span className="block font-medium">{user.displayName}</span>
                      <span className="text-xs text-crown-mist">{user.email}</span>
                    </td>
                    <td className="py-4 capitalize">{user.role.replace("_", " ")}</td>
                    <td className="py-4 capitalize text-crown-champagne">{user.tier}</td>
                    <td className="py-4 capitalize">{user.status}</td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          user.mfaEnabled
                            ? "border-crown-emerald/30 bg-crown-emerald/10 text-crown-emerald"
                            : "border-crown-rose/30 bg-crown-rose/10 text-crown-rose"
                        }`}
                      >
                        <LockKeyhole size={14} />
                        {user.mfaEnabled ? "Enabled" : "Required"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoTile>

        <BentoTile title="Open Invites" eyebrow="Onboarding" className="md:col-span-4 lg:col-span-6">
          <div className="grid gap-3 md:grid-cols-2">
            {inviteRows.map((invite) => (
              <div key={invite.id} className="rounded-lg border border-white/10 bg-crown-ink p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{invite.email}</p>
                    <p className="mt-1 text-sm capitalize text-crown-mist">
                      {invite.role.replace("_", " ")} · {invite.tier}
                    </p>
                  </div>
                  <span className="rounded-full border border-crown-gold/30 bg-crown-gold/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-crown-gold">
                    {invite.status}
                  </span>
                </div>
                <p className="mt-4 text-xs text-crown-mist">
                  Invited by {invite.invitedBy}. Expires {new Date(invite.expiresAt).toLocaleDateString()}.
                </p>
              </div>
            ))}
          </div>
        </BentoTile>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
        {icon}
      </div>
      <p className="text-sm text-crown-mist">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
