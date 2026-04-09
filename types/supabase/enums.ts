export interface Enums {
  financial_entry_status:
    | "pending"
    | "partially_paid"
    | "paid"
    | "cancelled"
  financial_entry_type:
    | "payable"
    | "receivable"
    | "expense"
    | "commission"
    | "advance"
    | "partner_contribution"
    | "partner_withdrawal"
    | "loan_receivable"
    | "loan_payable"
    | "internal_credit"
  financial_movement_type: "credit" | "debit"
}

export const Constants = {
  public: {
    Enums: {
      financial_entry_status: [
        "pending",
        "partially_paid",
        "paid",
        "cancelled",
      ],
      financial_entry_type: [
        "payable",
        "receivable",
        "expense",
        "commission",
        "advance",
        "partner_contribution",
        "partner_withdrawal",
        "loan_receivable",
        "loan_payable",
        "internal_credit",
      ],
      financial_movement_type: ["credit", "debit"],
    },
  },
} as const
