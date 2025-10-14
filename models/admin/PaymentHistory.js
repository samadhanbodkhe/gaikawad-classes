const mongoose = require("mongoose");

const PaymentHistorySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    month: {
      type: String, // e.g., "2025-10"
      required: true,
    },

    baseSalary: {
      type: Number,
      required: true,
    },

    paidAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    pendingAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "upi", "cash", "cheque", "manual", "other"],
      default: "manual",
    },

    transactionRef: { type: String, trim: true },
    remarks: { type: String, trim: true },

    paidDate: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate salary for same teacher & month
PaymentHistorySchema.index({ teacherId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("PaymentHistory", PaymentHistorySchema);
