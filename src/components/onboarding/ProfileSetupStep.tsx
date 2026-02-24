import { useState, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { Camera, Linkedin, Twitter, Instagram, User, CheckCircle2, XCircle, Upload, Loader2, Sparkles, Link2 } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import ImageEditor from "./ImageEditor";

export default function ProfileSetupStep({ form }: { form: UseFormReturn<any> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  
  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG or PNG file");
      return;
    }

    // Validate file size (5MB max for profile pictures)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Open image editor with the selected file
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
        toast.warning("You must be logged in to upload a profile picture");
        return;
      }

      const fileName = `${user.id}/profile-picture.jpg`;

      // Delete old profile picture if exists
      await supabase.storage
        .from("profile-pictures")
        .remove([fileName]);

      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, editedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(fileName);

      form.setValue("profilePictureUrl", publicUrl);
      toast.success("Profile picture uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload profile picture");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-matepeak-primary to-matepeak-secondary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Complete Your Profile</h3>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          Add a professional photo and connect your social profiles to build credibility with students
        </p>
      </div>

      {/* Profile Picture Upload Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 pt-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700">1</span>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Profile Picture</h4>
            <p className="text-sm text-gray-600">Click on the avatar or upload button to add your photo</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50/50 space-y-6">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-4 mx-auto lg:mx-0">
              <FormField
                control={form.control}
                name="profilePicture"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <Avatar 
                          className="h-40 w-40 cursor-pointer border-4 border-white shadow-md hover:shadow-lg transition-all"
                          onClick={handleProfilePictureClick}
                        >
                          <AvatarImage src={previewUrl || form.watch("profilePictureUrl") || ""} />
                          <AvatarFallback 
                            className="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center cursor-pointer"
                            onClick={handleProfilePictureClick}
                          >
                            {uploading ? (
                              <Loader2 className="h-10 w-10 text-gray-600 animate-spin" />
                            ) : (
                              <Camera className="h-10 w-10 text-gray-400" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {form.watch("profilePictureUrl") && !uploading && (
                          <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-md">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                        <div 
                          className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          onClick={handleProfilePictureClick}
                        >
                          <Camera className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    </FormControl>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                onClick={handleProfilePictureClick}
                disabled={uploading}
                variant="outline"
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
                    {form.watch("profilePictureUrl") ? "Change Photo" : "Upload Photo"}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center max-w-[160px]">
                JPG or PNG | Max 5MB | Min 400x400px
              </p>
            </div>

            {/* Image Editor Modal */}
            <ImageEditor
              open={editorOpen}
              onClose={() => setEditorOpen(false)}
              imageUrl={tempImageUrl}
              onSave={handleSaveEditedImage}
            />

            {/* Guidelines */}
            <div className="flex-1 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Do's</h4>
                  </div>
                  <ul className="space-y-2.5 text-sm text-gray-700">
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>Clear, well-lit professional headshot</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>Face clearly visible and centered</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>Professional or smart casual attire</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>Neutral or clean background</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>Natural smile to appear approachable</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Don'ts</h4>
                  </div>
                  <ul className="space-y-2.5 text-sm text-gray-700">
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-600 font-bold mt-0.5">✗</span>
                      <span>Group photos with other people</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-600 font-bold mt-0.5">✗</span>
                      <span>Selfies or casual vacation photos</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-600 font-bold mt-0.5">✗</span>
                      <span>Sunglasses, hats, or face coverings</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-600 font-bold mt-0.5">✗</span>
                      <span>Blurry or low-quality images</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-600 font-bold mt-0.5">✗</span>
                      <span>Overly edited or filtered photos</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Social Links Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700">2</span>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Social Profiles <span className="text-sm font-normal text-gray-500">(Optional)</span></h4>
            <p className="text-sm text-gray-600">Connect your professional profiles to build trust</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-5">
          <FormField
            control={form.control}
            name="socialLinks.linkedin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">LinkedIn</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Linkedin className="h-5 w-5 text-gray-700" />
                    </div>
                    <Input 
                      placeholder="https://linkedin.com/in/your-profile" 
                      {...field} 
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialLinks.twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Twitter / X</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Twitter className="h-5 w-5 text-gray-700" />
                    </div>
                    <Input 
                      placeholder="https://twitter.com/your-handle" 
                      {...field} 
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialLinks.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Instagram</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Instagram className="h-5 w-5 text-gray-700" />
                    </div>
                    <Input 
                      placeholder="https://instagram.com/your-username" 
                      {...field} 
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
