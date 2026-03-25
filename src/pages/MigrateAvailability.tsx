import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/sonner";
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function MigrateAvailability() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const migrateAvailability = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return;
      }

      // Get user's availability_json
      const { data: profile, error: profileError } = await supabase
        .from('expert_profiles')
        .select('availability_json, username')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.availability_json) {
        toast.info('No availability data found');
        setResult({ status: 'info', message: 'No availability_json data to migrate' });
        return;
      }

      // Parse the availability_json
      let availableHours;
      try {
        availableHours = JSON.parse(profile.availability_json);
      } catch (e) {
        toast.error('Invalid availability data format');
        setResult({ status: 'error', message: 'Could not parse availability_json' });
        return;
      }

      if (!availableHours || typeof availableHours !== 'object' || Array.isArray(availableHours)) {
        toast.info('Availability is not in Phase 1 format');
        setResult({ status: 'info', message: 'Availability is not in Phase 1 weekly format' });
        return;
      }

      // Day name to day_of_week mapping
      const dayMap: { [key: string]: number } = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      // Delete existing recurring slots
      const { error: deleteError } = await supabase
        .from('availability_slots')
        .delete()
        .eq('expert_id', user.id)
        .eq('is_recurring', true);

      if (deleteError) {
        console.error('Error deleting old slots:', deleteError);
      }

      // Convert availableHours to slots
      const slots: any[] = [];
      
      Object.entries(availableHours).forEach(([dayKey, dayData]: [string, any]) => {
        if (dayData.enabled && dayData.slots && Array.isArray(dayData.slots)) {
          const dayOfWeek = dayMap[dayKey.toLowerCase()];
          
          if (dayOfWeek !== undefined) {
            dayData.slots.forEach((slot: { start: string; end: string }) => {
              slots.push({
                expert_id: user.id,
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
        toast.info('No enabled availability slots found');
        setResult({ status: 'info', message: 'No enabled slots in availability data', data: availableHours });
        return;
      }

      // Insert new slots
      const { error: insertError } = await supabase
        .from('availability_slots')
        .insert(slots);

      if (insertError) {
        console.error('Error inserting slots:', insertError);
        toast.error(`Failed to insert slots: ${insertError.message}`);
        setResult({ status: 'error', message: insertError.message });
        return;
      }

      toast.success(`✅ Successfully migrated ${slots.length} availability slots!`);
      setResult({ 
        status: 'success', 
        message: `Migrated ${slots.length} slots`,
        slots: slots 
      });

    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(`Migration failed: ${error.message}`);
      setResult({ status: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Migrate Phase 1 Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This utility migrates your Phase 1 availability data (stored as JSON) 
              to the availability_slots table so it displays in your calendar and public profile.
            </p>

            <Button 
              onClick={migrateAvailability}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Migrating...' : 'Migrate My Availability'}
            </Button>

            {result && (
              <Card className={`mt-4 ${
                result.status === 'success' ? 'border-green-500 bg-green-50' :
                result.status === 'error' ? 'border-red-500 bg-red-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
                    {result.status === 'error' && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    {result.status === 'info' && <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
                    
                    <div className="flex-1">
                      <p className={`font-medium ${
                        result.status === 'success' ? 'text-green-900' :
                        result.status === 'error' ? 'text-red-900' :
                        'text-blue-900'
                      }`}>
                        {result.message}
                      </p>
                      
                      {result.slots && (
                        <div className="mt-3 text-sm">
                          <p className="font-semibold mb-2">Created Slots:</p>
                          <pre className="bg-white p-3 rounded border overflow-auto max-h-96">
                            {JSON.stringify(result.slots, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {result.data && (
                        <div className="mt-3 text-sm">
                          <p className="font-semibold mb-2">Availability Data:</p>
                          <pre className="bg-white p-3 rounded border overflow-auto max-h-96">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
