import mongoose from "mongoose";
import { Password } from "../services/password";

interface UserAttrs {
  email: string;
  password: string;
  name: string;
}

interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  id: string;
  name: string;
}

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please provide a valid email",
      },
      lowercase: true, // Normalize email case
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string): boolean =>
          /^[A-Za-z]{2,}\s[A-Za-z]{2,}$/.test(v.trim()),
        message:
          "Name must be in format 'firstName lastName' with each part at least 2 characters",
      },
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        const { _id, email, name } = ret;
        return { id: _id, email, name };
      },
    },
    versionKey: false,
  },
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const hashedPassword = await Password.toHash(this.get("password"));
    this.set("password", hashedPassword);
  }
});

userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };

export interface UserPayload {
  id: string;
  email: string;
  name: string;
}
