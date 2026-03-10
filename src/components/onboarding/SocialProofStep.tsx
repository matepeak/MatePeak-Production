import { UseFormReturn } from "react-hook-form";
import { Shield, Linkedin, Github, Globe, Video, CheckCircle2 } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function SocialProofStep({ form }: { form: UseFormReturn<any> }) {
  const linkedinUrl = form.watch("socialLinks.linkedin");
  const githubUrl = form.watch("socialLinks.github");
  const websiteUrl = form.watch("socialLinks.website");
  const videoIntroUrl = form.watch("videoIntroductionUrl");
  
  // Check if mentor selected tech-related category
  const category = form.watch("category");
  const isTechMentor = category && (
    category === "Programming & Tech" || 
    (Array.isArray(category) && category.includes("Programming & Tech"))
  );

  // Calculate if any proof exists (only count GitHub for tech mentors)
  const hasAnyProof = linkedinUrl || 
    (isTechMentor && githubUrl) || 
    websiteUrl || 
    videoIntroUrl;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Social Proof & Verification</h3>
          <p className="text-gray-600 text-sm mt-1">
            Build trust by connecting your professional profiles
          </p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-gray-700">
          <strong>Why social proof?</strong> Linking your professional profiles helps students verify your credentials and builds trust. 
          All fields are optional, but more proof = higher credibility!
        </AlertDescription>
      </Alert>

      {/* Trust Score Indicator */}
      {hasAnyProof && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-green-900">Building Your Trust Score</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {linkedinUrl && <Badge variant="secondary" className="bg-blue-100 text-blue-700">LinkedIn ✓</Badge>}
            {isTechMentor && githubUrl && <Badge variant="secondary" className="bg-gray-100 text-gray-700">GitHub ✓</Badge>}
            {websiteUrl && <Badge variant="secondary" className="bg-purple-100 text-purple-700">Website ✓</Badge>}
            {videoIntroUrl && <Badge variant="secondary" className="bg-amber-100 text-amber-700">Video Intro ✓</Badge>}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* LinkedIn Profile */}
        <FormField
          control={form.control}
          name="socialLinks.linkedin"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <div className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-600" />
                <FormLabel className="text-base font-semibold text-gray-900">
                  LinkedIn Profile
                  <Badge variant="outline" className="ml-2 text-xs">Recommended</Badge>
                </FormLabel>
              </div>
              <FormDescription className="text-sm text-gray-600">
                Your LinkedIn profile helps verify your professional identity and background
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="https://linkedin.com/in/your-profile"
                  {...field}
                  className="transition-all"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t border-gray-200"></div>

        {/* GitHub/Portfolio - Only for tech mentors */}
        {isTechMentor && (
          <>
            <FormField
              control={form.control}
              name="socialLinks.github"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Github className="w-5 h-5 text-gray-800" />
                    <FormLabel className="text-base font-semibold text-gray-900">
                      GitHub or Portfolio
                      <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
                    </FormLabel>
                  </div>
                  <FormDescription className="text-sm text-gray-600">
                    Showcase your technical projects, code repositories, and portfolio
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/your-username or your-portfolio.com"
                      {...field}
                      className="transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="border-t border-gray-200"></div>
          </>
        )}

        {/* Website/Blog */}
        <FormField
          control={form.control}
          name="socialLinks.website"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                <FormLabel className="text-base font-semibold text-gray-900">
                  Personal Website or Blog
                  <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
                </FormLabel>
              </div>
              <FormDescription className="text-sm text-gray-600">
                Share your blog, personal website, or professional portfolio
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="https://yourwebsite.com"
                  {...field}
                  className="transition-all"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t border-gray-200"></div>

        {/* Video Introduction */}
        <FormField
          control={form.control}
          name="videoIntroductionUrl"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-600" />
                <FormLabel className="text-base font-semibold text-gray-900">
                  Video Introduction (30-60 seconds)
                  <Badge variant="outline" className="ml-2 text-xs border-amber-300 text-amber-700">High Trust Value</Badge>
                </FormLabel>
              </div>
              <FormDescription className="text-sm text-gray-600">
                Upload a short video introducing yourself (YouTube, Loom, or Vimeo link). This significantly builds trust!
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
                  {...field}
                  className="transition-all"
                />
              </FormControl>
              <FormMessage />
              <Alert className="border-amber-200 bg-amber-50 mt-3">
                <Video className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-xs text-gray-700">
                  <strong>Pro tip:</strong> A genuine video intro builds 3x more trust than text alone. 
                  Keep it casual, be yourself, and explain what you love about mentoring!
                </AlertDescription>
              </Alert>
            </FormItem>
          )}
        />
      </div>

      {/* Empty State Encouragement */}
      {!hasAnyProof && (
        <Alert className="border-gray-200 bg-gray-50">
          <Shield className="w-4 h-4 text-gray-600" />
          <AlertDescription className="text-sm text-gray-600">
            <strong>Get started!</strong> Add at least one social proof link to significantly increase your profile's credibility. 
            LinkedIn + Video Intro = Instant "Verified" badge! 🎯
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
