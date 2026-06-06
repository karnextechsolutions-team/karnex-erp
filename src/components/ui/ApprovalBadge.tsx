import { CheckCircle2, XCircle, Clock } from 'lucide-react'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export default function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 uppercase tracking-wider">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Approved
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 uppercase tracking-wider">
        <XCircle className="w-3.5 h-3.5" />
        Rejected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 uppercase tracking-wider">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  )
}
