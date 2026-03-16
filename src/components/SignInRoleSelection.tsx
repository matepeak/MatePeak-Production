import { useNavigate } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SignInRoleSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SignInRoleSelection = ({ open, onOpenChange }: SignInRoleSelectionProps) => {
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'student' | 'mentor') => {
    onOpenChange(false);
    navigate(role === 'student' ? '/student/login' : '/expert/login');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Sign In to MatePeak</DialogTitle>
          <DialogDescription className="text-center">
            Choose your account type to continue
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5 mt-6">
          <Card 
            className="cursor-pointer bg-[#f2f2f2] transition-all hover:scale-105 hover:shadow-lg border-2 border-transparent hover:border-matepeak-primary"
            onClick={() => handleRoleSelect('student')}
          >
            <CardHeader className="text-center pb-4 pt-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-matepeak-primary/10 rounded-full flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-matepeak-primary" />
              </div>
              <CardTitle className="text-xl">I'm a Student</CardTitle>
              <CardDescription className="text-sm pt-1">
                Access your learning dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-6 px-6">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  View your sessions
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Browse expert mentors
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Manage bookings
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer bg-[#f2f2f2] transition-all hover:scale-105 hover:shadow-lg border-2 border-transparent hover:border-matepeak-primary"
            onClick={() => handleRoleSelect('mentor')}
          >
            <CardHeader className="text-center pb-4 pt-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-matepeak-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-matepeak-primary" />
              </div>
              <CardTitle className="text-xl">I'm a Mentor</CardTitle>
              <CardDescription className="text-sm pt-1">
                Access your expert dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-6 px-6">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Manage your sessions
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  View your earnings
                </li>
                <li className="flex items-center">
                  <span className="mr-2">✓</span>
                  Update your profile
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignInRoleSelection;