import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectDB = async (MONGODB_URL) => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    try {
      cached.promise = mongoose.connect(MONGODB_URL, {
        dbName: "wheelworks",
        bufferCommands: false,
      });
    } catch (err) {
      cached.promise = null;
      throw err;
    }
  }

  try {
    cached.conn = await cached.promise;
    console.log("✅ MongoDB connected:", cached.conn.connection.host);
  } catch (err) {
    cached.promise = null; // reset so retry works
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }

  return cached.conn;
};
