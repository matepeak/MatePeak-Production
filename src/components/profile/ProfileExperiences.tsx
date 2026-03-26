import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  GraduationCap, 
  Award, 
  Calendar,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Target
} from "lucide-react";

interface ProfileExperiencesProps {
  mentor: {
    education?: unknown[];
    teaching_certifications?: unknown[];
    experience?: number;
    teaching_experience?: string;
    has_no_certificate?: boolean;
  };
}

export default function ProfileExperiences({ mentor }: ProfileExperiencesProps) {
  const education = Array.isArray(mentor.education) ? mentor.education : [];
  const certifications = Array.isArray(mentor.teaching_certifications) 
    ? mentor.teaching_certifications 
    : [];
  const yearsOfExperience = mentor.experience || 0;

  // Calculate experience level
  const getExperienceLevel = (years: number) => {
    if (years < 2) return "Beginner";
    if (years < 5) return "Intermediate";
    if (years < 10) return "Advanced";
    return "Expert";
  };

  const experienceLevel = getExperienceLevel(yearsOfExperience);

  const getRecord = (
    value: unknown
  ): Record<string, unknown> | undefined => {
    if (value && typeof value === "object") {
      return value as Record<string, unknown>;
    }
    return undefined;
  };

  const getEducationInstitution = (edu: unknown) => {
    const value = getRecord(edu);
    return value?.institution || value?.university || "Institution";
  };

  const getEducationField = (edu: unknown) => {
    const value = getRecord(edu);
    return value?.field || value?.subject || "";
  };

  const getEducationYearLabel = (edu: unknown) => {
    const value = getRecord(edu);
    if (value?.year) return String(value.year);
    if (value?.yearFrom && value?.yearTo) return `${value.yearFrom} - ${value.yearTo}`;
    if (value?.yearFrom && value?.currentlyStudying) {
      return `${value.yearFrom} - Present`;
    }
    if (value?.yearFrom) return String(value.yearFrom);
    return "";
  };

  const getCertificationName = (cert: unknown) => {
    const value = getRecord(cert);
    return value?.name || value?.certificateName || value?.title || "Certification";
  };

  const getCertificationIssuer = (cert: unknown) => {
    const value = getRecord(cert);
    return value?.issuer || value?.issuedBy || "";
  };

  const getCertificationYear = (cert: unknown) => {
    const value = getRecord(cert);
    if (value?.year) return String(value.year);
    if (value?.yearFrom && value?.yearTo) return `${value.yearFrom} - ${value.yearTo}`;
    if (value?.yearFrom) return String(value.yearFrom);
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Years of Experience & Level */}
      {yearsOfExperience > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Experience Level</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {yearsOfExperience}+ {yearsOfExperience === 1 ? "Year" : "Years"}
                </p>
                <p className="text-sm text-gray-600 mt-1">of teaching & mentoring experience</p>
              </div>
              <Badge variant="secondary" className="bg-gray-900 text-white px-3 py-1 text-sm">
                {experienceLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teaching Experience Description */}
      {mentor.teaching_experience && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Teaching Philosophy</h2>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
              {mentor.teaching_experience}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Education Section */}
      {education.length > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Education</h2>
            </div>

            <div className="space-y-6">
              {education.map((edu: unknown, index: number) => (
                <div key={index}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold text-gray-900 text-base mb-1">
                        {edu.degree || "Degree"}
                      </h3>
                      <p className="text-gray-700 font-medium text-sm mb-2">
                        {getEducationInstitution(edu)}
                      </p>
                      {getEducationField(edu) && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-white border border-gray-200 text-gray-700 text-xs font-normal">
                            {getEducationField(edu)}
                          </Badge>
                        </div>
                      )}
                      {getEducationYearLabel(edu) && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Graduated in {getEducationYearLabel(edu)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {index < education.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teaching Certifications */}
      {certifications.length > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Award className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Teaching Certifications
              </h2>
            </div>

            <div className="grid gap-4">
              {certifications.map((cert: unknown, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">
                        {getCertificationName(cert)}
                      </h3>
                      {getCertificationIssuer(cert) && (
                        <p className="text-gray-600 text-sm mb-2">
                          {getCertificationIssuer(cert)}
                        </p>
                      )}
                      {getCertificationYear(cert) && (
                        <Badge variant="outline" className="text-xs">
                          {getCertificationYear(cert)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Certificate Indicator */}
      {mentor.has_no_certificate && certifications.length === 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Teaching Certifications
              </h2>
            </div>
            <p className="text-gray-600 text-sm">
              This mentor has indicated they don't have formal teaching certifications,
              but brings valuable practical experience and knowledge.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Information Available */}
      {education.length === 0 && certifications.length === 0 && !mentor.has_no_certificate && yearsOfExperience === 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6 text-center">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">
              Education and certification information not provided yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
