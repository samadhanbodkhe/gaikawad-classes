const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    default: "Cash",
  },
  note: {
    type: String,
    trim: true,
  },
  receivedBy: {
    type: String,
    trim: true,
  }
});

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
      required: true,
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
    fees: {
      totalAmount: {
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
        default: function () {
          return this.fees.totalAmount - this.fees.paidAmount;
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
      paymentHistory: [paymentHistorySchema],
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
    this.fees.pendingAmount = this.fees.totalAmount - this.fees.paidAmount;

    if (this.fees.pendingAmount <= 0) {
      this.fees.paymentStatus = "Paid";
      this.fees.pendingAmount = 0;
    } else if (this.fees.paidAmount > 0) {
      this.fees.paymentStatus = "Partial";
    } else {
      this.fees.paymentStatus = "Pending";
    }
  }
  next();
});

module.exports = mongoose.model("Student", studentSchema);