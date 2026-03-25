import MultiStepSignupForm from "@/components/auth/MultiStepSignupForm";
import SEO from "@/components/SEO";


export default function MentorSignup() {
  return (
    <>
      <SEO
        title="Mentor Signup | MatePeak"
        description="Create your mentor account on MatePeak."
        canonicalPath="/mentor/signup"
        noindex
      />
      <MultiStepSignupForm role="mentor" successRedirectPath="/expert/onboarding" />
    </>
  );
}
