import { UseFormReturn } from "react-hook-form";
import { GraduationCap, Award, Briefcase, Plus, X, AlertCircle } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { universitiesByCountry, degreeTypes, fieldsOfStudy } from "@/data/universitiesByCountry";

interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  currentlyStudying: boolean;
  customInstitution?: string;
  customDegree?: string;
  customField?: string;
}

interface CertificationEntry {
  name: string;
  issuer: string;
  year: string;
}

interface ExperienceEntry {
  company: string;
  role: string;
  years: string;
  helpStudents: string;
}

export default function CredentialsAndBackgroundStep({ form }: { form: UseFormReturn<any> }) {
  const [education, setEducation] = useState<EducationEntry[]>(
    form.getValues("education") || []
  );
  const [certifications, setCertifications] = useState<CertificationEntry[]>(
    form.getValues("teachingCertifications") || []
  );
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    form.getValues("professionalExperience") || []
  );
  const [hasNoCertificate, setHasNoCertificate] = useState(
    form.getValues("hasNoCertificate") || false
  );
  const [hasNoExperience, setHasNoExperience] = useState(
    form.getValues("hasNoExperience") || false
  );

  // Get mentor's country from form (from Phase 1)
  const mentorCountry = form.getValues("country") || "United States";
  
  // Get relevant universities based on mentor's country
  const availableUniversities = useMemo(() => {
    const countryUniversities = universitiesByCountry[mentorCountry] || [];
    return [...countryUniversities, "Other (Enter manually)"];
  }, [mentorCountry]);

  // Generate year options for start year (current year and past only)
  const startYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 70; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  // Generate year options for end year (current year and past only)
  const endYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 70; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  // Generate expected end year options for currently studying (future allowed up to +10 years)
  const expectedEndYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 10; year >= currentYear; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  // Helper function to check if a required field is empty
  const isFieldEmpty = (edu: EducationEntry, field: string) => {
    if (field === 'institution') {
      if (edu.institution === "Other (Enter manually)") {
        return !edu.customInstitution || edu.customInstitution.trim() === "";
      }
      return !edu.institution || edu.institution.trim() === "";
    }
    if (field === 'degree') {
      if (edu.degree === "Other") {
        return !edu.customDegree || edu.customDegree.trim() === "";
      }
      return !edu.degree || edu.degree.trim() === "";
    }
    if (field === 'field') {
      if (edu.field === "Other") {
        return !edu.customField || edu.customField.trim() === "";
      }
      return !edu.field || edu.field.trim() === "";
    }
    if (field === 'startYear') {
      return !edu.startYear || edu.startYear.trim() === "";
    }
    if (field === 'endYear') {
      // End year is not required if currently studying
      if (edu.currentlyStudying) return false;
      return !edu.endYear || edu.endYear.trim() === "";
    }
    return false;
  };

  const addEducation = () => {
    const newEducation = [...education, { 
      institution: "", 
      degree: "", 
      field: "", 
      startYear: "", 
      endYear: "",
      currentlyStudying: false,
    }];
    setEducation(newEducation);
    form.setValue("education", newEducation);
  };

  const removeEducation = (index: number) => {
    const newEducation = education.filter((_, i) => i !== index);
    setEducation(newEducation);
    form.setValue("education", newEducation);
  };

  const updateEducation = (index: number, field: keyof EducationEntry, value: string | boolean) => {
    const newEducation = [...education];
    newEducation[index] = {
      ...newEducation[index],
      [field]: value
    };
    setEducation(newEducation);
    form.setValue("education", newEducation);
  };

  const addCertification = () => {
    const newCerts = [...certifications, { name: "", issuer: "", year: "" }];
    setCertifications(newCerts);
    form.setValue("teachingCertifications", newCerts);
  };

  const removeCertification = (index: number) => {
    const newCerts = certifications.filter((_, i) => i !== index);
    setCertifications(newCerts);
    form.setValue("teachingCertifications", newCerts);
  };

  const updateCertification = (index: number, field: keyof CertificationEntry, value: string) => {
    const newCerts = [...certifications];
    newCerts[index][field] = value;
    setCertifications(newCerts);
    form.setValue("teachingCertifications", newCerts);
  };

  const addExperience = () => {
    const newExp = [...experience, { company: "", role: "", years: "", helpStudents: "" }];
    setExperience(newExp);
    form.setValue("professionalExperience", newExp);
  };

  const removeExperience = (index: number) => {
    const newExp = experience.filter((_, i) => i !== index);
    setExperience(newExp);
    form.setValue("professionalExperience", newExp);
  };

  const updateExperience = (index: number, field: keyof ExperienceEntry, value: string) => {
    const newExp = [...experience];
    newExp[index][field] = value;
    setExperience(newExp);
    form.setValue("professionalExperience", newExp);
  };

  const toggleNoCertificate = (checked: boolean) => {
    setHasNoCertificate(checked);
    form.setValue("hasNoCertificate", checked);
    if (checked) {
      setCertifications([]);
      form.setValue("teachingCertifications", []);
    }
  };

  const toggleNoExperience = (checked: boolean) => {
    setHasNoExperience(checked);
    form.setValue("hasNoExperience", checked);
    if (checked) {
      setExperience([]);
      form.setValue("professionalExperience", []);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Credentials & Background</h3>
          <p className="text-gray-600 text-sm mt-1">
            Build trust by showcasing your education and professional experience
          </p>
        </div>
      </div>

      {/* Education */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Education</h4>
            <span className="text-red-500">*</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addEducation}>
            <Plus className="w-4 h-4 mr-2" />
            Add Education
          </Button>
        </div>

        {education.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Please add at least one complete education entry to continue. All fields marked with * are required and will show a red border when empty.
            </AlertDescription>
          </Alert>
        )}

        {education.map((edu, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-700">Entry {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEducation(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Institution Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">University/Institution *</label>
                <Select
                  value={edu.institution}
                  onValueChange={(value) => updateEducation(index, "institution", value)}
                >
                  <SelectTrigger className={isFieldEmpty(edu, 'institution') ? "border-red-300 focus:border-red-500" : ""}>
                    <SelectValue placeholder="Select your institution" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableUniversities.map((uni) => (
                      <SelectItem key={uni} value={uni}>
                        {uni}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {edu.institution === "Other (Enter manually)" && (
                  <Input
                    placeholder="Enter your institution name"
                    value={edu.customInstitution || ""}
                    onChange={(e) => updateEducation(index, "customInstitution", e.target.value)}
                    className={`mt-2 ${isFieldEmpty(edu, 'institution') ? "border-red-300 focus:border-red-500" : ""}`}
                  />
                )}
              </div>

              {/* Degree and Field of Study */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Degree *</label>
                  <Select
                    value={edu.degree}
                    onValueChange={(value) => updateEducation(index, "degree", value)}
                  >
                    <SelectTrigger className={isFieldEmpty(edu, 'degree') ? "border-red-300 focus:border-red-500" : ""}>
                      <SelectValue placeholder="Select degree" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {degreeTypes.map((degree) => (
                        <SelectItem key={degree} value={degree}>
                          {degree}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {edu.degree === "Other" && (
                    <Input
                      placeholder="Enter degree name"
                      value={edu.customDegree || ""}
                      onChange={(e) => updateEducation(index, "customDegree", e.target.value)}
                      className={`mt-2 ${isFieldEmpty(edu, 'degree') ? "border-red-300 focus:border-red-500" : ""}`}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Field of Study *</label>
                  <Select
                    value={edu.field}
                    onValueChange={(value) => updateEducation(index, "field", value)}
                  >
                    <SelectTrigger className={isFieldEmpty(edu, 'field') ? "border-red-300 focus:border-red-500" : ""}>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {fieldsOfStudy.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {edu.field === "Other" && (
                    <Input
                      placeholder="Enter field of study"
                      value={edu.customField || ""}
                      onChange={(e) => updateEducation(index, "customField", e.target.value)}
                      className={`mt-2 ${isFieldEmpty(edu, 'field') ? "border-red-300 focus:border-red-500" : ""}`}
                    />
                  )}
                </div>
              </div>

              {/* Start and End Years */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Year *</label>
                  <Select
                    value={edu.startYear}
                    onValueChange={(value) => updateEducation(index, "startYear", value)}
                  >
                    <SelectTrigger className={isFieldEmpty(edu, 'startYear') ? "border-red-300 focus:border-red-500" : ""}>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {startYearOptions.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {edu.currentlyStudying ? "Expected End Year (Optional)" : "End Year *"}
                  </label>
                  <Select
                    value={edu.endYear}
                    onValueChange={(value) => updateEducation(index, "endYear", value)}
                  >
                    <SelectTrigger className={isFieldEmpty(edu, 'endYear') ? "border-red-300 focus:border-red-500" : ""}>
                      <SelectValue placeholder={edu.currentlyStudying ? "Select expected graduation year" : "Select year"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {(edu.currentlyStudying ? expectedEndYearOptions : endYearOptions).map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Currently Studying Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`currently-studying-${index}`}
                  checked={edu.currentlyStudying || false}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    const newEducation = [...education];
                    newEducation[index] = {
                      ...newEducation[index],
                      currentlyStudying: isChecked,
                      endYear: "" // Clear end year when toggling
                    };
                    setEducation(newEducation);
                    form.setValue("education", newEducation);
                  }}
                />
                <label
                  htmlFor={`currently-studying-${index}`}
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  I am currently studying here
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Teaching Certifications */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-gray-900">Teaching Certifications</h4>
            <span className="text-red-500">*</span>
          </div>
          {!hasNoCertificate && (
            <Button type="button" variant="outline" size="sm" onClick={addCertification}>
              <Plus className="w-4 h-4 mr-2" />
              Add Certification
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasNoCertificate"
            checked={hasNoCertificate}
            onCheckedChange={toggleNoCertificate}
          />
          <label
            htmlFor="hasNoCertificate"
            className="text-sm text-gray-600 cursor-pointer"
          >
            I don't have any teaching certifications yet
          </label>
        </div>

        {!hasNoCertificate && certifications.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Please add at least one certification or check the box above if you don't have any yet.
            </AlertDescription>
          </Alert>
        )}

        {!hasNoCertificate && certifications.map((cert, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-amber-50">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-700">Certification {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCertification(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Input
                placeholder="Certification Name"
                value={cert.name}
                onChange={(e) => updateCertification(index, "name", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Issuing Organization"
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, "issuer", e.target.value)}
                />
                <Input
                  placeholder="Year Obtained"
                  value={cert.year}
                  onChange={(e) => updateCertification(index, "year", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Professional Experience */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Professional Experience</h4>
            <span className="text-red-500">*</span>
          </div>
          {!hasNoExperience && (
            <Button type="button" variant="outline" size="sm" onClick={addExperience}>
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasNoExperience"
            checked={hasNoExperience}
            onCheckedChange={toggleNoExperience}
          />
          <label
            htmlFor="hasNoExperience"
            className="text-sm text-gray-600 cursor-pointer"
          >
            I don't have any professional experience yet
          </label>
        </div>

        {!hasNoExperience && experience.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Please add at least one professional experience or check the box above if you don't have any yet.
            </AlertDescription>
          </Alert>
        )}

        {!hasNoExperience && experience.map((exp, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-green-50">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-gray-700">Experience {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeExperience(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Input
                placeholder="Company/Organization"
                value={exp.company}
                onChange={(e) => updateExperience(index, "company", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Role/Position"
                  value={exp.role}
                  onChange={(e) => updateExperience(index, "role", e.target.value)}
                />
                <Input
                  placeholder="Years (e.g., 2020-2023)"
                  value={exp.years}
                  onChange={(e) => updateExperience(index, "years", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  How would your experience help students?
                </label>
                <Textarea
                  placeholder="Describe how your professional experience will benefit students you mentor..."
                  value={exp.helpStudents || ""}
                  onChange={(e) => updateExperience(index, "helpStudents", e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={6000}
                />
                <p className="text-xs text-gray-500 text-right">
                  {(exp.helpStudents || "").length} / 1000 words (approx. {Math.round((exp.helpStudents || "").split(/\s+/).filter(w => w.length > 0).length)} words)
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
