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
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'],
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
