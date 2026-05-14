import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'admin';
  college: string;
  engagementTier: 'champion' | 'regular' | 'new' | 'unreliable';
  reliabilityScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    college: { type: String, default: '' },
    engagementTier: {
      type: String,
      enum: ['champion', 'regular', 'new', 'unreliable'],
      default: 'new',
    },
    reliabilityScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

UserSchema.index({ engagementTier: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
