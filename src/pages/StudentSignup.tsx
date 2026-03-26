import MultiStepSignupForm from "@/components/auth/MultiStepSignupForm";
import SEO from "@/components/SEO";

const StudentSignup = () => {
  return (
    <>
      <SEO
        title="Student Signup | MatePeak"
        description="Create your student account on MatePeak."
        canonicalPath="/student/signup"
        noindex
      />
      <MultiStepSignupForm role="student" successRedirectPath="/dashboard" />
    </>
  );
};

export default StudentSignup;
