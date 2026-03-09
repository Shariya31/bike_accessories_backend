import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin'],
        default: 'user'
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },

    password: {
        type: String,
        trim: true,
        select: false
    },

    provider: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },

    googleId: {
        type: String
    },

    avatar: {
        url: {
            type: String,
            trim: true,
        },
        public_id: {
            type: String,
            trim: true
        }
    },

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    phone: {
        type: String,
        trim: true
    },

    address: {
        type: String,
        trim: true
    },

    deletedAt: {
        type: Date,
        default: null,
        index: true
    },

},
    { timestamps: true })

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods = {
    comparePassword: async function (password) {
        return await bcrypt.compare(password, this.password)
    }
}

const UserModel = mongoose.models.User || mongoose.model('User', userSchema, 'users')

export default UserModel