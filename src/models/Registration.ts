import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistration extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  registrationId: string;
  qrCode: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  anomalyScore?: number;
  flagged: boolean;
  adminOverride: boolean;
  paymentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    registrationId: { type: String, required: true, unique: true },
    qrCode: { type: String, required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    anomalyScore: { type: Number },
    flagged: { type: Boolean, default: false },
    adminOverride: { type: Boolean, default: false },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate registrations
RegistrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export default mongoose.models.Registration ||
  mongoose.model<IRegistration>('Registration', RegistrationSchema);
