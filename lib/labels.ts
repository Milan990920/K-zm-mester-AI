export const INVOICE_TYPE_LABELS: Record<string, string> = {
  SETTLEMENT: "Elszámoló",
  PARTIAL: "Részszámla",
  CONSOLIDATED: "Göngyölített",
  CREDIT: "Jóváíró",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Nyitott",
  PAID: "Fizetve",
  OVERDUE: "Késedelmes",
};

export const PAYMENT_STATUS_BADGE_CLASSES: Record<string, string> = {
  OPEN: "bg-brass/10 text-brass",
  PAID: "bg-[#2E8F92]/10 text-[#2E8F92]",
  OVERDUE: "bg-danger/10 text-danger",
};
