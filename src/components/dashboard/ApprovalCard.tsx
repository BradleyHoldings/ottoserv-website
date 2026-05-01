"use client";

interface ApprovalCardProps {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  amount?: number;
  type?: string;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}

export default function ApprovalCard({
  id,
  title,
  description,
  requestedBy,
  amount,
  type = "Approval Request",
  onApprove,
  onDeny,
}: ApprovalCardProps) {
  return (
    <div className="bg-[#111827] border border-orange-900/40 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-orange-400 font-medium uppercase tracking-wide mb-1">
            {type}
          </p>
          <h4 className="text-white font-semibold">{title}</h4>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        {amount !== undefined && (
          <div className="text-right flex-shrink-0">
            <p className="text-white font-bold text-lg">
              ${amount.toLocaleString()}
            </p>
            <p className="text-gray-500 text-xs">amount</p>
          </div>
        )}
      </div>
      <p className="text-gray-500 text-xs mb-4">
        Requested by: <span className="text-gray-400">{requestedBy}</span>
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => onApprove(id)}
          className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-900/50 rounded-lg text-sm font-medium transition-colors"
        >
          ✓ Approve
        </button>
        <button
          onClick={() => onDeny(id)}
          className="flex-1 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-900/40 rounded-lg text-sm font-medium transition-colors"
        >
          ✕ Deny
        </button>
      </div>
    </div>
  );
}
