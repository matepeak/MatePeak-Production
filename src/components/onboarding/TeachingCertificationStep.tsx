import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Plus, Trash2, Upload } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface TeachingCertificationStepProps {
  form: UseFormReturn<any>;
}

export default function TeachingCertificationStep({ form }: TeachingCertificationStepProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const certifications = form.watch("teachingCertifications") || [];
  const hasNoCertificate = form.watch("hasNoCertificate");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

  const addCertification = () => {
    const current = form.getValues("teachingCertifications") || [];
    form.setValue("teachingCertifications", [
      ...current,
      {
        subject: "",
        certificateName: "",
        description: "",
        issuedBy: "",
        yearFrom: "",
        yearTo: "",
        certificateFile: null,
        certificateUrl: "",
        isVerified: false,
      },
    ]);
  };

  const removeCertification = (index: number) => {
    const current = form.getValues("teachingCertifications") || [];
    form.setValue(
      "teachingCertifications",
      current.filter((_, i) => i !== index)
    );
  };

  const handleFileUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG or PNG file");
      return;
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      toast.error("File size must be less than 20MB");
      return;
    }

    setUploadingIndex(index);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.warning("You must be logged in to upload files");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/certificates/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("teaching-certificates")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("teaching-certificates")
        .getPublicUrl(fileName);

      const current = form.getValues("teachingCertifications");
      current[index].certificateUrl = publicUrl;
      form.setValue("teachingCertifications", [...current]);

      toast.success("Certificate uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload certificate");
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Teaching Certification</h2>
        <p className="text-gray-600">
          Do you have teaching certificates? If so, describe them to enhance your profile credibility and get more students.
        </p>
      </div>

      <FormField
        control={form.control}
        name="hasNoCertificate"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    form.setValue("teachingCertifications", []);
                  }
                }}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="font-medium">I don't have a teaching certificate</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {!hasNoCertificate && (
        <>
          {certifications.map((cert: any, index: number) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Certificate {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCertification(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name={`teachingCertifications.${index}.subject`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`teachingCertifications.${index}.certificateName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., TEFL Certificate" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`teachingCertifications.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the certificate..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`teachingCertifications.${index}.issuedBy`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issued by</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Cambridge University" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`teachingCertifications.${index}.yearFrom`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Year</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`teachingCertifications.${index}.yearTo`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Year (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base">Get a "Certificate verified" badge</CardTitle>
                    <CardDescription>
                      Upload your certificate to boost your credibility! Our team will review it and add the badge to
                      your profile. Once reviewed, your files will be deleted.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">JPG or PNG format; maximum size of 20MB.</p>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingIndex === index}
                        onClick={() => {
                          const input = document.getElementById(`file-upload-${index}`) as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingIndex === index ? "Uploading..." : cert.certificateUrl ? "Change File" : "Upload"}
                      </Button>
                      <input
                        id={`file-upload-${index}`}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(index, e)}
                      />
                      {cert.certificateUrl && (
                        <span className="text-sm text-green-600 font-medium">✓ Certificate uploaded</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addCertification}
            className="w-full border-dashed border-2 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add another certificate
          </Button>
        </>
      )}
    </div>
  );
}
