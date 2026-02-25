import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Schema definitions
const basicInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Username can only contain lowercase letters, numbers, underscores, and hyphens"
    ),
  category: z
    .array(z.string())
    .min(1, "Please select at least one expertise area"),
  expertiseTags: z.array(z.string()).optional(),
  countryOfBirth: z.string().min(1, "Please select your country"),
  languages: z
    .array(
      z.object({
        language: z.string(),
        level: z.string(),
      })
    )
    .min(1, "Please add at least one language"),
  phoneNumber: z.string().optional(),
  ageConfirmation: z
    .boolean()
    .refine((val) => val === true, "You must confirm you are over 18"),
});

const serviceTypesSchema = z.object({
  oneOnOneSession: z.boolean().optional(),
  chatAdvice: z.boolean().optional(),
  digitalProducts: z.boolean().optional(),
  notes: z.boolean().optional(),
});

const availabilitySchema = z.object({
  availability: z
    .array(
      z.object({
        day: z.string(),
        slots: z
          .array(
            z.object({
              start: z.string(),
              end: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

const pricingSchema = z.object({
  servicePricing: z.object({
    oneOnOneSession: z
      .object({
        enabled: z.boolean().optional(),
        price: z.number().min(0, "Price must be positive").optional(),
        hasFreeDemo: z.boolean().optional(),
      })
      .optional(),
    chatAdvice: z
      .object({
        enabled: z.boolean().optional(),
        price: z.number().min(0, "Price must be positive").optional(),
        hasFreeDemo: z.boolean().optional(),
      })
      .optional(),
    digitalProducts: z
      .object({
        enabled: z.boolean().optional(),
        price: z.number().min(0, "Price must be positive").optional(),
      })
      .optional(),
    notes: z
      .object({
        enabled: z.boolean().optional(),
        price: z.number().min(0, "Price must be positive").optional(),
      })
      .optional(),
  }),
});

const profileDescriptionSchema = z.object({
  introduction: z
    .string()
    .min(50, "Please write at least 50 characters")
    .max(400, "Introduction must be less than 400 characters"),
  teachingExperience: z
    .string()
    .min(50, "Please write at least 50 characters")
    .max(400, "Teaching experience must be less than 400 characters"),
  motivation: z
    .string()
    .min(50, "Please write at least 50 characters")
    .max(400, "Motivation must be less than 400 characters"),
  headline: z
    .string()
    .min(10, "Headline must be at least 10 characters")
    .max(100, "Headline must be less than 100 characters"),
});

const teachingCertificationSchema = z.object({
  hasNoCertificate: z.boolean().optional(),
  teachingCertifications: z
    .array(
      z.object({
        subject: z.string().min(1, "Subject is required"),
        certificateName: z.string().min(1, "Certificate name is required"),
        description: z.string().optional(),
        issuedBy: z.string().min(1, "Issued by is required"),
        yearFrom: z.string().min(1, "Start year is required"),
        yearTo: z.string().optional(),
        certificateFile: z.any().optional(),
        certificateUrl: z.string().optional(),
        isVerified: z.boolean().optional(),
      })
    )
    .optional(),
});

const educationSchema = z.object({
  education: z
    .array(
      z.object({
        degree: z.string().min(1, "Degree is required"),
        university: z.string().min(1, "University is required"),
        subject: z.string().min(1, "Subject is required"),
        yearFrom: z.string().min(1, "Start year is required"),
        yearTo: z.string().optional(),
        currentlyStudying: z.boolean().optional(),
      })
    )
    .min(1, "Please add at least one education entry"),
});

const profileSetupSchema = z.object({
  profilePicture: z.any().optional(),
  profilePictureUrl: z.string().optional(),
  socialLinks: z
    .object({
      linkedin: z
        .string()
        .url("Please enter a valid URL")
        .or(z.literal(""))
        .optional(),
      instagram: z
        .string()
        .url("Please enter a valid URL")
        .or(z.literal(""))
        .optional(),
      twitter: z
        .string()
        .url("Please enter a valid URL")
        .or(z.literal(""))
        .optional(),
    })
    .optional(),
});

const identityVerificationSchema = z.object({
  verificationPhotoUrl: z.string().optional(),
  verificationStatus: z.enum(["pending", "verified", "failed"]).optional(),
  verificationDate: z.string().optional(),
});

const outcomeBasedSchema = z.object({
  targetAudience: z
    .object({
      students: z.boolean().optional(),
      freshers: z.boolean().optional(),
      professionals: z.boolean().optional(),
      founders: z.boolean().optional(),
    })
    .optional(),
  problemsHelped: z
    .object({
      careerConfusion: z.boolean().optional(),
      resumeRejection: z.boolean().optional(),
      interviewFear: z.boolean().optional(),
      skillRoadmap: z.boolean().optional(),
      personalBranding: z.boolean().optional(),
    })
    .optional(),
  outcomesDelivered: z
    .object({
      clearDirection: z.boolean().optional(),
      feedback: z.boolean().optional(),
      roadmap: z.boolean().optional(),
      ongoingSupport: z.boolean().optional(),
    })
    .optional(),
  suggestedServices: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        enabled: z.boolean(),
        serviceType: z.string(),
      })
    )
    .optional(),
});

export const formSchema = z.object({
  ...basicInfoSchema.shape,
  ...teachingCertificationSchema.shape,
  ...educationSchema.shape,
  ...profileDescriptionSchema.shape,
  ...outcomeBasedSchema.shape,
  ...serviceTypesSchema.shape,
  ...availabilitySchema.shape,
  ...pricingSchema.shape,
  ...profileSetupSchema.shape,
  ...identityVerificationSchema.shape,
});

export type FormValues = z.infer<typeof formSchema>;

export function useExpertOnboardingForm() {
  return useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      category: [],
      expertiseTags: [],
      countryOfBirth: "",
      languages: [],
      phoneNumber: "",
      ageConfirmation: false,
      hasNoCertificate: false,
      teachingCertifications: [],
      education: [],
      introduction: "",
      teachingExperience: "",
      motivation: "",
      headline: "",
      targetAudience: {
        students: false,
        freshers: false,
        professionals: false,
        founders: false,
      },
      problemsHelped: {
        careerConfusion: false,
        resumeRejection: false,
        interviewFear: false,
        skillRoadmap: false,
        personalBranding: false,
      },
      outcomesDelivered: {
        clearDirection: false,
        feedback: false,
        roadmap: false,
        ongoingSupport: false,
      },
      suggestedServices: [],
      oneOnOneSession: false,
      chatAdvice: false,
      digitalProducts: false,
      notes: false,
      availability: [],
      servicePricing: {
        oneOnOneSession: { enabled: false, price: 0, hasFreeDemo: false },
        chatAdvice: { enabled: false, price: 0, hasFreeDemo: false },
        digitalProducts: { enabled: false, price: 0 },
        notes: { enabled: false, price: 0 },
      },
      profilePictureUrl: "",
      socialLinks: {
        linkedin: "",
        instagram: "",
        twitter: "",
      },
    },
    mode: "onChange",
  });
}
