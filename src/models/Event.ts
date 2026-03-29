import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  category: string;
  date: Date;
  endDate: Date;
  venue: string;
  capacity: number;
  registeredCount: number;
  imageUrl: string;
  organizer: string;
  tags: string[];
  isActive: boolean;
  feeType: 'free' | 'paid';
  feeAmount: number;
  registrationDeadline?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Hackathon', 'Other'],
      default: 'Other',
    },
    date: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: { type: String, required: true },
    capacity: { type: Number, required: true, default: 100 },
    registeredCount: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    organizer: { type: String, required: true },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    feeType: { type: String, enum: ['free', 'paid'], default: 'free' },
    feeAmount: { type: Number, default: 0 },
    registrationDeadline: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EventSchema.pre('save', function (next) {
  if (this.endDate <= this.date) {
    next(new Error('endDate must be after date'));
  } else {
    next();
  }
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
