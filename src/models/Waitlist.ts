import mongoose, { Document, Schema } from 'mongoose';

export interface IWaitlist extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  priorityScore: number;
  joinedAt: Date;
  abandonedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSchema = new Schema<IWaitlist>({
  eventId:       { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  priorityScore: { type: Number, required: true },
  joinedAt:      { type: Date, required: true, default: Date.now },
  abandonedAt:   { type: Date, default: null },
}, { timestamps: true });

WaitlistSchema.index({ eventId: 1, userId: 1 }, { unique: true });
WaitlistSchema.index({ eventId: 1, priorityScore: 1 });

export default mongoose.models.Waitlist ||
  mongoose.model<IWaitlist>('Waitlist', WaitlistSchema);
