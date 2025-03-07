import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['unresolved', 'in_progress', 'resolved'],
    default: 'unresolved'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
});

const Log = mongoose.model('Log', LogSchema);

export default Log; 