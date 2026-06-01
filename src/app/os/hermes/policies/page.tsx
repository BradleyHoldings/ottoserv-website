import { hermesPolicyPermissions } from "@/lib/hermesCommandCenter";

export default function HermesPoliciesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">Policy / Authority Viewer</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Authority boundaries for Hermes and agents</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
          This shell makes the operating policy visible: what is autonomous, what requires approval, what is forbidden, and which agent launches need Jonathan.
        </p>
      </div>
      {hermesPolicyPermissions.map((policy) => (
        <article key={policy.category} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-2xl font-black text-white">{policy.category}</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <List label="What Hermes can do without approval" items={policy.canDoWithoutApproval} />
            <List label="What requires approval" items={policy.requiresApproval} tone="warning" />
            <List label="What is forbidden" items={policy.forbidden} tone="danger" />
            <List label="Which actions are currently unlocked" items={policy.unlockedActions} />
            <List label="Which approvals expire" items={policy.expiringApprovals} tone="warning" />
            <List label="Which agents can be spawned under policy" items={policy.spawnableAgents} />
            <List label="Which agents require approval before launch" items={policy.approvalRequiredAgents} tone="warning" />
          </div>
        </article>
      ))}
    </div>
  );
}

function List({ label, items, tone = "default" }: { label: string; items: string[]; tone?: "default" | "warning" | "danger" }) {
  const classes = {
    default: "border-white/10 bg-white/[0.03]",
    warning: "border-amber-400/20 bg-amber-400/10",
    danger: "border-red-400/20 bg-red-500/10",
  };

  return (
    <div className={`rounded-2xl border p-4 ${classes[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-gray-200">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
