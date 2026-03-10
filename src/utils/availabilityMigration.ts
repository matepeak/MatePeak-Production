import { supabase } from "@/integrations/supabase/client";

/**
 * Automatically migrates availability_json to availability_slots if needed
 * This helps mentors who completed onboarding before the migration was working
 */
export async function autoMigrateAvailabilitySlots(expertId: string): Promise<boolean> {
  try {
    console.log('🔍 Checking if availability migration is needed for expert:', expertId);
    
    // Check if there are any existing availability_slots
    const { data: existingSlots, error: slotsError } = await supabase
      .from("availability_slots")
      .select("id")
      .eq("expert_id", expertId)
      .eq("is_recurring", true)
      .limit(1);

    if (slotsError) {
      console.error('Error checking existing slots:', slotsError);
      return false;
    }

    // If slots already exist, no migration needed
    if (existingSlots && existingSlots.length > 0) {
      console.log('✅ Availability slots already exist, no migration needed');
      return true;
    }

    // Check for availability_json that needs migration
    const { data: profile, error: profileError } = await supabase
      .from("expert_profiles")
      .select("availability_json")
      .eq("id", expertId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return false;
    }

    if (!profile?.availability_json) {
      console.log('ℹ️ No availability_json to migrate');
      return false;
    }

    // Parse availability_json
    let availableHours;
    try {
      availableHours = JSON.parse(profile.availability_json);
    } catch (e) {
      console.error('Failed to parse availability_json:', e);
      return false;
    }

    // Check if it's in the correct format (object with day keys)
    if (!availableHours || typeof availableHours !== 'object' || Array.isArray(availableHours)) {
      console.log('ℹ️ Availability data is not in Phase 1 weekly format');
      return false;
    }

    // Perform migration
    console.log('📅 Migrating availability_json to availability_slots...');

    const dayMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const slots: any[] = [];
    
    Object.entries(availableHours).forEach(([dayKey, dayData]: [string, any]) => {
      if (dayData.enabled && dayData.slots && Array.isArray(dayData.slots)) {
        const dayOfWeek = dayMap[dayKey.toLowerCase()];
        
        if (dayOfWeek !== undefined) {
          dayData.slots.forEach((slot: { start: string; end: string }) => {
            slots.push({
              expert_id: expertId,
              day_of_week: dayOfWeek,
              start_time: slot.start,
              end_time: slot.end,
              is_recurring: true,
              specific_date: null,
            });
          });
        }
      }
    });

    if (slots.length === 0) {
      console.log('ℹ️ No enabled slots found in availability_json');
      return false;
    }

    // Insert slots
    const { error: insertError } = await supabase
      .from("availability_slots")
      .insert(slots);

    if (insertError) {
      console.error('❌ Failed to migrate availability slots:', insertError);
      return false;
    }

    console.log(`✅ Successfully migrated ${slots.length} availability slots`);
    return true;

  } catch (error) {
    console.error('❌ Error in autoMigrateAvailabilitySlots:', error);
    return false;
  }
}
