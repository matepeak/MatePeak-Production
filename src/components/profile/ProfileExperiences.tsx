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
  Languages,
  Target,
  Lightbulb
} from "lucide-react";

interface ProfileExperiencesProps {
  mentor: any;
}

export default function ProfileExperiences({ mentor }: ProfileExperiencesProps) {
  const education = Array.isArray(mentor.education) ? mentor.education : [];
  const certifications = Array.isArray(mentor.teaching_certifications) 
    ? mentor.teaching_certifications 
    : [];
  // Prioritize skills field (from current onboarding) over expertise_tags (from old onboarding)
  const skills = (mentor.skills && Array.isArray(mentor.skills) && mentor.skills.length > 0) 
    ? mentor.skills 
    : (Array.isArray(mentor.expertise_tags) ? mentor.expertise_tags : []);
  const languages = Array.isArray(mentor.languages) ? mentor.languages : [];
  const yearsOfExperience = mentor.experience || 0;

  // Calculate experience level
  const getExperienceLevel = (years: number) => {
    if (years < 2) return "Beginner";
    if (years < 5) return "Intermediate";
    if (years < 10) return "Advanced";
    return "Expert";
  };

  const experienceLevel = getExperienceLevel(yearsOfExperience);

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

      {/* Skills & Expertise */}
      {skills.length > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Skills & Expertise</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string, index: number) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="px-3 py-1 bg-white text-gray-700 border border-gray-200 font-normal"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Languages</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languages.map((lang: any, index: number) => (
                <div 
                  key={index}
                  className="p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm">{lang.language}</span>
                    <Badge variant="outline" className="text-xs">
                      {lang.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
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
              {education.map((edu: any, index: number) => (
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
                        {edu.institution || "Institution"}
                      </p>
                      {edu.field && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="bg-white border border-gray-200 text-gray-700 text-xs font-normal">
                            {edu.field}
                          </Badge>
                        </div>
                      )}
                      {edu.year && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>Graduated in {edu.year}</span>
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
              {certifications.map((cert: any, index: number) => (
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
                        {cert.name || cert.title || "Certification"}
                      </h3>
                      {cert.issuer && (
                        <p className="text-gray-600 text-sm mb-2">
                          {cert.issuer}
                        </p>
                      )}
                      {cert.year && (
                        <Badge variant="outline" className="text-xs">
                          {cert.year}
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
