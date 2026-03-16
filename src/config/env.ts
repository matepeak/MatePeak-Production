import { z } from "zod";

/**
 * Environment Variables Validation Schema
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Supabase Configuration (Required)
  VITE_SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid URL")
    .refine(
      (url) => url.includes("supabase.co"),
      "VITE_SUPABASE_URL must be a Supabase URL"
    ),

  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "VITE_SUPABASE_ANON_KEY is required"),

  // Optional Configuration
  VITE_ENABLE_AI_SEARCH: z.enum(["true", "false"]).default("false").optional(),

  VITE_PAYMENT_PROVIDER: z
    .enum(["razorpay", "stripe"])
    .default("razorpay")
    .optional(),

  // Analytics (Optional)
  VITE_GOOGLE_ANALYTICS_ID: z.string().optional(),
});

/**
 * Validate and parse environment variables
 * Throws an error if required variables are missing or invalid
 */
function validateEnv() {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_ENABLE_AI_SEARCH: import.meta.env.VITE_ENABLE_AI_SEARCH,
    VITE_PAYMENT_PROVIDER: import.meta.env.VITE_PAYMENT_PROVIDER,
    VITE_GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
  });

  if (!result.success) {
    console.error("❌ Environment validation failed:");
    console.error("Missing or invalid environment variables:");

    const errors = result.error.flatten().fieldErrors;
    Object.entries(errors).forEach(([field, messages]) => {
      console.error(`  - ${field}: ${messages?.join(", ")}`);
    });

    console.error("\n📝 To fix this:");
    console.error("  1. Copy .env.example to .env");
    console.error("  2. Fill in your Supabase credentials");
    console.error("  3. Restart the development server\n");

    throw new Error(
      "Invalid environment configuration. Check console for details."
    );
  }

  return result.data;
}

/**
 * Validated environment variables
 * Access via: import { env } from '@/config/env'
 */
export const env = validateEnv();

/**
 * Type-safe environment access
 */
export type Env = z.infer<typeof envSchema>;
