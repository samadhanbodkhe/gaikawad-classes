const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      default: "A",
      trim: true,
    },
    admissionDate: {
      type: Date,
      required: true,
    },
    parentName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid contact number!`,
      },
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    // 🔹 Fee details
    fees: {
      totalAmount: {
        type: Number,
        required: true,
      },
      paidAmount: {
        type: Number,
        default: 0,
      },
      pendingAmount: {
        type: Number,
        default: function () {
          return this.fees
            ? this.fees.totalAmount - this.fees.paidAmount
            : 0;
        },
      },
      lastPaymentDate: {
        type: Date,
        default: null,
      },
      paymentStatus: {
        type: String,
        enum: ["Paid", "Partial", "Pending"],
        default: "Pending",
      },
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ✅ Compound Index (Unique rollNumber per class + section)
studentSchema.index({ className: 1, section: 1, rollNumber: 1 }, { unique: true });

// 🔹 Auto update fee status before saving
studentSchema.pre("save", function (next) {
  if (this.fees) {
    this.fees.pendingAmount =
      this.fees.totalAmount - (this.fees.paidAmount || 0);

    if (this.fees.pendingAmount <= 0) {
      this.fees.paymentStatus = "Paid";
    } else if (this.fees.paidAmount > 0) {
      this.fees.paymentStatus = "Partial";
    } else {
      this.fees.paymentStatus = "Pending";
    }
  }
  next();
});

module.exports = mongoose.model("Student", studentSchema);
