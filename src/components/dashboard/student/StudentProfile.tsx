import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase,
  Bell,
  Shield,
  CreditCard,
  Trash2,
  Save,
  Upload,
  Calendar,
  Camera,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ImageEditor from '@/components/onboarding/ImageEditor';

interface StudentProfileProps {
  studentProfile: any;
  onProfileUpdate?: (updatedProfile: any) => void;
}

export default function StudentProfile({ studentProfile, onProfileUpdate }: StudentProfileProps) {
  const [profile, setProfile] = useState<any>(studentProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    occupation: '',
    bio: '',
    learning_goals: '',
    interests: [] as string[],
  });
  const [notifications, setNotifications] = useState({
    email_sessions: true,
    email_messages: true,
    email_reminders: true,
    email_marketing: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get student profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const profileData = data || {
        id: user.id,
        email: user.email,
      };

      setProfile(profileData);
      setProfilePictureUrl(profileData.avatar_url || '');
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || user.email || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        occupation: profileData.occupation || '',
        bio: profileData.bio || '',
        learning_goals: profileData.learning_goals || '',
        interests: profileData.interests || [],
      });

      // Get notification preferences (you may need to create this table)
      // For now, using default values

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a JPG or PNG file');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Open image editor
    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl);
    setEditorOpen(true);
  };

  const handleSaveEditedImage = async (editedBlob: Blob) => {
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(editedBlob));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.warning('You must be logged in to upload a profile picture');
        return;
      }

      const fileName = `${user.id}/profile-picture.jpg`;

      // Delete old profile picture if exists
      await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, editedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Add cache-busting parameter to force refresh
      const publicUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new picture URL
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrlWithCache,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfilePictureUrl(publicUrlWithCache);
      toast.success('Profile picture updated successfully!');
      
      // Call onProfileUpdate if provided
      if (onProfileUpdate) {
        onProfileUpdate(data);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload profile picture');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          phone: formData.phone,
          location: formData.location,
          avatar_url: profilePictureUrl,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Profile updated successfully!');
      
      // Call onProfileUpdate if provided to refresh parent component
      if (onProfileUpdate && data) {
        onProfileUpdate(data);
      }
      
      fetchProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your data including bookings and reviews. Are you absolutely sure?')) {
      return;
    }

    try {
      // TODO: Implement account deletion logic
      // This should handle:
      // 1. Cancel all upcoming bookings
      // 2. Delete user data
      // 3. Sign out and redirect
      toast.error('Account deletion is not yet implemented. Please contact support.');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const addInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData({
        ...formData,
        interests: [...formData.interests, interest]
      });
    }
  };

  const removeInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter(i => i !== interest)
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Picture Section */}
      <Card className="border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Profile Picture
          </h3>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 cursor-pointer border-4 border-white shadow-md hover:shadow-lg transition-all">
                <AvatarImage
                  src={previewUrl || profilePictureUrl || ""}
                  alt="Profile"
                  onClick={handleProfilePictureClick}
                />
                <AvatarFallback
                  className="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center cursor-pointer"
                  onClick={handleProfilePictureClick}
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 text-gray-400" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={handleProfilePictureClick}
              >
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleProfilePictureClick}
                disabled={uploading}
                className="border-2 border-gray-300 hover:border-black hover:bg-gray-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                JPG or PNG | Max 5MB | Recommended: 400x400px
              </p>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Image Editor Modal */}
      <ImageEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        imageUrl={tempImageUrl}
        onSave={handleSaveEditedImage}
      />

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="New York, USA"
              />
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full md:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_sessions">Session Notifications</Label>
              <p className="text-sm text-gray-500">
                Get notified about session confirmations and updates
              </p>
            </div>
            <Switch
              id="email_sessions"
              checked={notifications.email_sessions}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, email_sessions: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_messages">Message Notifications</Label>
              <p className="text-sm text-gray-500">
                Get notified when mentors send you messages
              </p>
            </div>
            <Switch
              id="email_messages"
              checked={notifications.email_messages}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, email_messages: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_reminders">Session Reminders</Label>
              <p className="text-sm text-gray-500">
                Get reminded before your sessions start
              </p>
            </div>
            <Switch
              id="email_reminders"
              checked={notifications.email_reminders}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, email_reminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_marketing">Marketing Emails</Label>
              <p className="text-sm text-gray-500">
                Receive tips, updates, and promotional content
              </p>
            </div>
            <Switch
              id="email_marketing"
              checked={notifications.email_marketing}
              onCheckedChange={(checked) => 
                setNotifications({ ...notifications, email_marketing: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Password</Label>
              <p className="text-sm text-gray-500">Last changed 3 months ago</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500">Not enabled</p>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Active Sessions</Label>
              <p className="text-sm text-gray-500">Manage your active devices</p>
            </div>
            <Button variant="outline" size="sm">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No payment methods added</p>
            <Button variant="outline">Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">Delete Account</h4>
            <p className="text-sm text-red-700 mb-4">
              Once you delete your account, there is no going back. This will:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside mb-4 space-y-1">
              <li>Cancel all upcoming sessions</li>
              <li>Delete all your data including reviews and messages</li>
              <li>Remove your profile permanently</li>
            </ul>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="w-full md:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
