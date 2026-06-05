import mongoose from "mongoose";

/**
 * User schema.
 *
 * resetToken        - the random string emailed to the user (stored hashed).
 * resetTokenExpiry  - timestamp after which the reset link is no longer valid.
 *
 * Both reset fields are cleared once the password is successfully changed,
 * exactly as required by the password reset flow.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
