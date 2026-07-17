import mongoose from 'mongoose';

// Platform operator account. `displayRole` is the human label shown in the
// admin UI (e.g. "Super Admin"); access-control role in the JWT is always
// 'admin'.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: 'System Administrator' },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    passwordHash: { type: String, required: true },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    },
    displayRole: { type: String, default: 'Super Admin' },
  },
  { timestamps: true },
);

adminSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    role: 'admin',
    isAuthenticated: true,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    displayRole: this.displayRole,
  };
};

export default mongoose.model('Admin', adminSchema);
