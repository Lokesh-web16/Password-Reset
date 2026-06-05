import mongoose from "mongoose";

/**
 * Establishes a connection to MongoDB using the MONGO_URI environment variable.
 * The process exits if the connection cannot be made, since the API is useless
 * without a database to read users from and store reset tokens in.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
