import { supabase } from "@/integrations/supabase/client";
import { FormValues } from "@/hooks/useExpertOnboardingForm";
import { notifyAvailabilityAlertMatches } from "@/services/availabilityAlertService";

export async function updateExpertProfile(data: FormValues | any) {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to complete onboarding");
  }

  // Convert availability array to a JSON string
  // Support both 'availability' (Phase 2) and 'availableHours' (Phase 1)
  const availabilityJson = data.availability 
    ? JSON.stringify(data.availability) 
    : data.availableHours 
    ? JSON.stringify(data.availableHours) 
    : null;

  console.log('💾 Saving expert profile...');
  console.log('📅 Availability data:', { 
    hasAvailability: !!data.availability, 
    hasAvailableHours: !!data.availableHours,
    availableHours: data.availableHours 
  });

  // First, check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from("expert_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
    
  if (checkError) {
    console.error("Error checking profile:", checkError);
  }

  // Create profile data object - only include fields that have values
  const profileData: any = {};
  
  // Save timezone if Phase 1 onboarding
  if (data.timezone) profileData.timezone = data.timezone;
  
  // Required fields (only if provided)
  if (data.firstName && data.lastName) {
    profileData.full_name = `${data.firstName} ${data.lastName}`;
  }
  if (data.username) profileData.username = data.username;
  if (data.countryOfBirth) profileData.country_of_birth = data.countryOfBirth;
  
  // Category fields
  if (data.category) {
    profileData.category = Array.isArray(data.category) ? data.category[0] : data.category;
    profileData.categories = Array.isArray(data.category) ? data.category : [data.category];
  }
  
  // Optional fields - ensure arrays are properly formatted
  if (data.expertiseTags !== undefined) {
    profileData.expertise_tags = Array.isArray(data.expertiseTags) ? data.expertiseTags : [];
  }
  if (data.skills !== undefined) {
    profileData.skills = Array.isArray(data.skills) ? data.skills : [];
  }
  if (data.languages !== undefined) {
    profileData.languages = Array.isArray(data.languages) ? data.languages : [];
  }
  if (data.servicePricing !== undefined) profileData.service_pricing = data.servicePricing;
  if (availabilityJson !== null) profileData.availability_json = availabilityJson;
  if (data.profilePictureUrl !== undefined) profileData.profile_picture_url = data.profilePictureUrl;
  if (data.socialLinks !== undefined) profileData.social_links = data.socialLinks;
  if (data.introduction !== undefined) profileData.introduction = data.introduction;
  if (data.teachingExperience !== undefined) profileData.teaching_experience = data.teachingExperience;
  if (data.motivation !== undefined) profileData.motivation = data.motivation;
  if (data.headline !== undefined) profileData.headline = data.headline;
  if (data.education !== undefined) profileData.education = data.education;
  
  // Teaching certifications
  if (data.hasNoCertificate !== undefined) {
    profileData.teaching_certifications = data.hasNoCertificate ? [] : (data.teachingCertifications || []);
    profileData.has_no_certificate = data.hasNoCertificate;
  } else if (data.teachingCertifications !== undefined) {
    profileData.teaching_certifications = data.teachingCertifications;
  }
  
  // Additional fields
  if (data.targetAudience !== undefined) profileData.target_audience = data.targetAudience || {};
  if (data.problemsHelped !== undefined) profileData.problems_helped = data.problemsHelped || {};
  if (data.outcomesDelivered !== undefined) profileData.outcomes_delivered = data.outcomesDelivered || {};
  
  // Identity verification fields
  if (data.verificationPhotoUrl !== undefined) profileData.verification_photo_url = data.verificationPhotoUrl || null;
  if (data.verificationStatus !== undefined) profileData.verification_status = data.verificationStatus || 'pending';
  if (data.verificationDate !== undefined) profileData.verification_date = data.verificationDate || null;
  
  // Profile status fields
  if (data.is_profile_live !== undefined) profileData.is_profile_live = data.is_profile_live;
  if (data.phase_1_complete !== undefined) profileData.phase_1_complete = data.phase_1_complete;
  if (data.phase_2_complete !== undefined) profileData.phase_2_complete = data.phase_2_complete;
  if (data.mentor_tier !== undefined) profileData.mentor_tier = data.mentor_tier;
  if (data.max_weekly_bookings !== undefined) profileData.max_weekly_bookings = data.max_weekly_bookings;
  
  // Set profile status to pending_review for admin approval when profile goes live
  if (data.is_profile_live === true && !profileData.profile_status) {
    profileData.profile_status = 'pending_review';
    profileData.is_verified = false;
  }

  let savedProfile;
  
  if (existingProfile) {
    // Update existing profile
    const { data: updateData, error } = await supabase
      .from("expert_profiles")
      .update(profileData)
      .eq("id", user.id)
      .select();

    if (error) {
      console.error("Update error:", error);
      console.error("Profile data being sent:", profileData);
      throw error;
    }
    
    savedProfile = updateData;
  } else {
    // Insert new profile
    const { data: insertData, error } = await supabase
      .from("expert_profiles")
      .insert({
        id: user.id,
        ...profileData,
      })
      .select();

    if (error) {
      console.error("Insert error:", error);
      console.error("Profile data being sent:", profileData);
      throw error;
    }
    
    savedProfile = insertData;
  }

  // Save availability to availability_slots table if availableHours exists
  if (data.availableHours && typeof data.availableHours === 'object') {
    console.log('📅 Saving Phase 1 availability slots...', data.availableHours);
    try {
      await saveAvailabilitySlots(user.id, data.availableHours);
    } catch (slotError) {
      console.error('❌ Failed to save availability slots, but profile saved:', slotError);
      // Don't fail the whole save, but log the error prominently
      toast?.error?.('Profile saved but availability slots may need manual migration');
    }
  } else {
    console.log('📅 No availableHours data found:', { 
      hasAvailableHours: !!data.availableHours,
      typeOfAvailableHours: typeof data.availableHours,
      keys: data.availableHours ? Object.keys(data.availableHours) : []
    });
  }
  
  // Also check for migrating existing availability_json
  if (existingProfile && savedProfile) {
    // Check if there's existing availability_json that needs to be migrated
    const { data: profileWithAvail } = await supabase
      .from("expert_profiles")
      .select("availability_json")
      .eq("id", user.id)
      .single();
    
    if (profileWithAvail?.availability_json) {
      try {
        const existingAvail = JSON.parse(profileWithAvail.availability_json);
        // Check if it's in the Phase 1 format (object with day keys)
        if (existingAvail && typeof existingAvail === 'object' && !Array.isArray(existingAvail)) {
          console.log('📅 Migrating existing availability_json to slots...', existingAvail);
          try {
            await saveAvailabilitySlots(user.id, existingAvail);
          } catch (migrateError) {
            console.error('❌ Failed to migrate availability_json to slots:', migrateError);
          }
        }
      } catch (e) {
        console.error('Could not parse existing availability_json:', e);
      }
    }
  }
  
  return { success: true, username: data.username };
}

// Helper function to convert availableHours to availability_slots table entries
async function saveAvailabilitySlots(expertId: string, availableHours: any) {
  console.log('📅 saveAvailabilitySlots called for expert:', expertId);
  console.log('📅 availableHours data:', availableHours);
  
  try {
    // Day name to day_of_week number mapping (Sunday = 0, Monday = 1, etc.)
    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    // Delete existing future availability slots for this expert (specific dates from today onwards)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const { error: deleteError } = await supabase
      .from("availability_slots")
      .delete()
      .eq("expert_id", expertId)
      .eq("is_recurring", false)
      .gte("specific_date", todayStr);

    if (deleteError) {
      console.error("⚠️ Error deleting old availability slots:", deleteError);
      throw new Error(`Failed to delete old availability slots: ${deleteError.message}`);
    } else {
      console.log('✅ Deleted old future-dated slots');
    }

    // Convert availableHours to availability_slots records for the next 7 days
    const slots: any[] = [];
    
    // Create slots for the next 7 days starting from today
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // Find matching day in availableHours
      Object.entries(availableHours).forEach(([dayKey, dayData]: [string, any]) => {
        if (dayData.enabled && dayData.slots && Array.isArray(dayData.slots)) {
          const dayOfWeek = dayMap[dayKey.toLowerCase()];
          
          if (dayOfWeek === targetDayOfWeek) {
            console.log(`Creating slots for ${dayKey} (${dateStr})`);
            
            dayData.slots.forEach((slot: { start: string; end: string }) => {
              slots.push({
                expert_id: expertId,
                day_of_week: dayOfWeek,
                start_time: slot.start,
                end_time: slot.end,
                is_recurring: false,
                specific_date: dateStr,
              });
            });
          }
        }
      });
    }

    console.log(`📅 Prepared ${slots.length} slots for the next 7 days:`, slots);

    // Insert new availability slots
    if (slots.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from("availability_slots")
        .insert(slots)
        .select();

      if (insertError) {
        console.error("❌ Error inserting availability slots:", insertError);
        throw new Error(`Failed to save availability slots: ${insertError.message}`);
      } else {
        console.log(`✅ Successfully saved ${slots.length} availability slots for expert ${expertId}`);
        console.log('✅ Inserted data:', insertedData);
        await notifyAvailabilityAlertMatches(expertId, slots);
      }
    } else {
      console.log('⚠️ No slots to insert (all days disabled or no slots defined)');
    }
  } catch (error) {
    console.error("❌ Error in saveAvailabilitySlots:", error);
    throw error; // Re-throw to be caught by caller
  }
}
