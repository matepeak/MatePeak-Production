
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Video, MessageCircle, BadgeCheck, Shield, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

const HowItWorks = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="How MatePeak Works | 1-on-1 Mentorship in 4 Steps"
        description="Learn how MatePeak works: find a mentor, book a session, meet via secure video, and grow with personalized guidance."
        canonicalPath="/how-it-works"
      />
      <Navbar />
      
      <main className="flex-grow">
        <div className="bg-mentor-light/30 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">How SparkMentor Works</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform connects college students with expert mentors for personalized guidance in academics, career, wellness, and more.
            </p>
          </div>
        </div>
        
        {/* Step-by-Step Process */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Your Mentorship Journey</h2>
            
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-mentor-light -ml-px md:-translate-x-1/2"></div>
                
                {/* Steps */}
                <div className="space-y-12">
                  {/* Step 1 */}
                  <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-16 h-16 rounded-full bg-mentor-primary text-white flex items-center justify-center z-10 flex-shrink-0">
                      <Search className="h-8 w-8" />
                    </div>
                    <div className="md:w-1/2 md:pr-12 md:text-right order-1 md:order-none">
                      <h3 className="text-xl font-bold mb-2">1. Find Your Mentor</h3>
                      <p className="text-gray-600">
                        Browse our curated selection of mentors or use our search filters to find the perfect match for your specific needs. Filter by expertise, rating, price, and availability.
                      </p>
                    </div>
                    <div className="hidden md:block md:w-1/2"></div>
                  </div>
                  
                  {/* Step 2 */}
                  <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-16 h-16 rounded-full bg-mentor-primary text-white flex items-center justify-center z-10 flex-shrink-0">
                      <Calendar className="h-8 w-8" />
                    </div>
                    <div className="hidden md:block md:w-1/2"></div>
                    <div className="md:w-1/2 md:pl-12">
                      <h3 className="text-xl font-bold mb-2">2. Book a Session</h3>
                      <p className="text-gray-600">
                        Select a time slot that works for you from your mentor's availability calendar. Specify what you'd like to discuss and any specific questions you have for your mentor.
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 3 */}
                  <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-16 h-16 rounded-full bg-mentor-primary text-white flex items-center justify-center z-10 flex-shrink-0">
                      <CreditCard className="h-8 w-8" />
                    </div>
                    <div className="md:w-1/2 md:pr-12 md:text-right order-1 md:order-none">
                      <h3 className="text-xl font-bold mb-2">3. Secure Payment</h3>
                      <p className="text-gray-600">
                        Complete your booking with our secure payment system. Your payment is held until after your session is successfully completed, ensuring satisfaction for both parties.
                      </p>
                    </div>
                    <div className="hidden md:block md:w-1/2"></div>
                  </div>
                  
                  {/* Step 4 */}
                  <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-16 h-16 rounded-full bg-mentor-primary text-white flex items-center justify-center z-10 flex-shrink-0">
                      <Video className="h-8 w-8" />
                    </div>
                    <div className="hidden md:block md:w-1/2"></div>
                    <div className="md:w-1/2 md:pl-12">
                      <h3 className="text-xl font-bold mb-2">4. Attend Your Session</h3>
                      <p className="text-gray-600">
                        Join your scheduled session via our secure video platform. Get personalized guidance and advice tailored to your specific needs and goals.
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 5 */}
                  <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-16 h-16 rounded-full bg-mentor-primary text-white flex items-center justify-center z-10 flex-shrink-0">
                      <MessageCircle className="h-8 w-8" />
                    </div>
                    <div className="md:w-1/2 md:pr-12 md:text-right order-1 md:order-none">
                      <h3 className="text-xl font-bold mb-2">5. Provide Feedback</h3>
                      <p className="text-gray-600">
                        After your session, share your experience by rating your mentor and leaving a review. Your feedback helps maintain quality and guides other students.
                      </p>
                    </div>
                    <div className="hidden md:block md:w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-16">
              <Link to="/mentors">
                <Button className="bg-mentor-primary hover:bg-mentor-secondary text-white px-8 py-6 text-lg">
                  Find a Mentor Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
        
        {/* Benefits Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-4 text-center">Why Choose SparkMentor?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-center mb-12">
              Our platform offers unique benefits designed to help you succeed with the right guidance.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <BadgeCheck className="h-12 w-12 text-mentor-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">Verified Experts</h3>
                <p className="text-gray-600">
                  All mentors on our platform are carefully vetted to ensure you're getting advice from qualified professionals with real expertise in their field.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <Shield className="h-12 w-12 text-mentor-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">Secure Platform</h3>
                <p className="text-gray-600">
                  Our platform provides a secure environment for mentoring sessions, with protected payments and privacy safeguards for both students and mentors.
                </p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <Calendar className="h-12 w-12 text-mentor-primary mb-6" />
                <h3 className="text-xl font-bold mb-3">Flexible Scheduling</h3>
                <p className="text-gray-600">
                  Book sessions that fit your schedule, with options for different session durations and the ability to reschedule if your plans change.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* FAQ Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            
            <div className="max-w-3xl mx-auto grid gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">How much does mentoring cost?</h3>
                <p className="text-gray-600">
                  Mentoring costs vary based on the mentor's expertise and experience. Each mentor sets their own rates, which are clearly displayed on their profile. Sessions typically range from ₹800 to ₹2000 per hour.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">What happens if I need to cancel a session?</h3>
                <p className="text-gray-600">
                  You can cancel a session up to 24 hours before the scheduled time for a full refund. Cancellations within 24 hours are subject to our cancellation policy, which may include partial or no refund depending on the circumstances.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">How are mentors verified?</h3>
                <p className="text-gray-600">
                  We verify mentors through a comprehensive process that includes credential verification, professional background checks, and an initial interview. We also monitor mentor ratings and feedback to ensure ongoing quality.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">Can I change my mentor if I'm not satisfied?</h3>
                <p className="text-gray-600">
                  Yes, if you're not satisfied with your mentoring session, you can request a different mentor for future sessions. We also offer a satisfaction guarantee for your first session with a new mentor.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">How do the video sessions work?</h3>
                <p className="text-gray-600">
                  Our sessions take place through our secure video platform. You'll receive a link to join your session at the scheduled time. All you need is a stable internet connection and a device with a camera and microphone.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-16 bg-mentor-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Find Your Perfect Mentor?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of students who are accelerating their growth with personalized mentorship.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <Button className="bg-white text-mentor-primary hover:bg-gray-100 text-lg px-8 py-6">
                  Get Started
                </Button>
              </Link>
              <Link to="/mentors">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                  Browse Mentors
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default HowItWorks;
