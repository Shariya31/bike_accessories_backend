import { z } from "zod";

export const zSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email address" }),

  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[A-Za-z\s]+$/, "Name can only contain letters and spaces"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[0-9]/, "Must include at least one number")
    .regex(/[^A-Za-z0-9]/, "Must include at least one special character"),

  otp: z.string().regex(/^\d{6}$/, {
    message: "OTP must be a 6 digit number"
  }),
   _id:z.string().min(3, '_id is required'),
  alt:z.string().min(3, 'Alt is required'),
  title: z.string().min(3, 'Title is required')
});