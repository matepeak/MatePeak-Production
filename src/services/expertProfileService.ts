import { supabase } from "@/integrations/supabase/client";
import { FormValues } from "@/hooks/useExpertOnboardingForm";

export async function updateExpertProfile(data: FormValues) {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to complete onboarding");
  }

  // Convert availability array to a JSON string
  const availabilityJson = JSON.stringify(data.availability);

  // First, check if profile exists
  const { data: existingProfile } = await supabase
    .from("expert_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  // Create profile data object
  const profileData = {
    full_name: `${data.firstName} ${data.lastName}`,
    username: data.username,
    // Support both old single category and new multiple categories format
    category: Array.isArray(data.category) ? data.category[0] : data.category, // For backward compatibility
    categories: Array.isArray(data.category) ? data.category : [data.category],
    expertise_tags: data.expertiseTags || [],
    languages: data.languages || [],
    // Unified services structure - all services now in service_pricing
    service_pricing: data.servicePricing,
    availability_json: availabilityJson,
    profile_picture_url: data.profilePictureUrl,
    social_links: data.socialLinks,
    introduction: data.introduction,
    teaching_experience: data.teachingExperience,
    motivation: data.motivation,
    headline: data.headline,
    education: data.education,
    teaching_certifications: data.hasNoCertificate
      ? []
      : data.teachingCertifications || [],
    has_no_certificate: data.hasNoCertificate || false,
    target_audience: data.targetAudience || {},
    problems_helped: data.problemsHelped || {},
    outcomes_delivered: data.outcomesDelivered || {},
    // Identity verification fields
    verification_photo_url: data.verificationPhotoUrl || null,
    verification_status: data.verificationStatus || 'pending',
    verification_date: data.verificationDate || null,
  };

  if (existingProfile) {
    // Update existing profile
    const { error } = await supabase
      .from("expert_profiles")
      .update(profileData)
      .eq("id", user.id);

    if (error) throw error;
  } else {
    // Insert new profile
    const { error } = await supabase.from("expert_profiles").insert({
      id: user.id,
      ...profileData,
    });

    if (error) throw error;
  }

  return { success: true, username: data.username };
}
