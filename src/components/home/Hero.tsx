import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

const Hero = () => {
  const [currentField, setCurrentField] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isMobileView, setIsMobileView] = useState(false);
  const navigate = useNavigate();

  const fields = [
    "Career Growth",
    "Mental Health",
    "Academic Success",
    "Interview Prep",
    "Skill Development",
    "Life Choices",
  ];

  const searchSuggestions = [
    "Career Mentorship",
    "Interview Preparation",
    "Mental Health Support",
    "Academic Guidance",
    "Skill Development",
    "Life Coaching",
  ];

  // Diverse mentor cards with various categories and Indian representation
  const mentorCards = [
    {
      id: "1",
      name: "Raj Malhotra",
      title: "Career Coach",
      company: "CareerPath Inc",
      image:
        "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "2",
      name: "Priya Sharma",
      title: "Mental Health Counselor",
      company: "MindWell",
      image:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "3",
      name: "Aditya Gupta",
      title: "Data Science Mentor",
      company: "Tech Academy",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "4",
      name: "Neha Reddy",
      title: "Interview Specialist",
      company: "PrepMaster",
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "5",
      name: "Arjun Singh",
      title: "Leadership Coach",
      company: "SkillHub",
      image:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "6",
      name: "Kavya Iyer",
      title: "Life & Wellness Coach",
      company: "LifePath",
      image:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "7",
      name: "Vikram Mehta",
      title: "Product Manager",
      company: "TechCorp",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "8",
      name: "Anjali Desai",
      title: "UX Design Mentor",
      company: "DesignLab",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "9",
      name: "Rohan Kapoor",
      title: "Business Strategy",
      company: "StartupHub",
      image:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "10",
      name: "Divya Nair",
      title: "Content Marketing",
      company: "GrowthCo",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "11",
      name: "Karan Patel",
      title: "Software Engineer",
      company: "Google",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "12",
      name: "Sneha Joshi",
      title: "HR & Recruitment",
      company: "TalentFirst",
      image:
        "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "13",
      name: "Siddharth Rao",
      title: "Finance Advisor",
      company: "WealthPro",
      image:
        "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "14",
      name: "Meera Krishnan",
      title: "Education Consultant",
      company: "EduExcel",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
    },
    {
      id: "15",
      name: "Aman Verma",
      title: "DevOps Engineer",
      company: "CloudTech",
      image:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces",
    },
  ];

  const expertProfiles = [
    {
      id: "1",
      image:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
      name: "Priya Sharma",
    },
    {
      id: "2",
      image:
        "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop&crop=faces",
      name: "Rahul Kumar",
    },
    {
      id: "3",
      image:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces",
      name: "Ananya Singh",
    },
    {
      id: "4",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
      name: "Arjun Patel",
    },
  ];

  useEffect(() => {
    const typingSpeed = 100;
    const deletingSpeed = 50;
    const delayBetweenWords = 2000;
    const currentWord = fields[currentField];

    if (!isDeleting && displayText === currentWord) {
      setTimeout(() => setIsDeleting(true), delayBetweenWords);
      return;
    }

    if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentField((prev) => (prev + 1) % fields.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        if (isDeleting) {
          setDisplayText(currentWord.substring(0, displayText.length - 1));
        } else {
          setDisplayText(currentWord.substring(0, displayText.length + 1));
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentField]);

  useEffect(() => {
    const heroElement = document.getElementById("hero-section");
    if (heroElement) {
      heroElement.classList.add("animate-fade-in-up", "opacity-100");
    }
  }, []);

  useEffect(() => {
    const updateView = () => {
      setIsMobileView(window.innerWidth < 640);
    };

    updateView();
    window.addEventListener("resize", updateView);
    return () => window.removeEventListener("resize", updateView);
  }, []);

  const popularOptions = ["Career Growth", "Mental Health", "Interview Prep"];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handlePopularClick = (option: string) => {
    navigate(`/explore?q=${encodeURIComponent(option)}`);
  };

  // Get filtered suggestions
  const getFilteredSuggestions = () => {
    return searchSuggestions
      .filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 5);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filteredSuggestions = getFilteredSuggestions();

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSearchDropdown(true);
      setSelectedSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        selectedSuggestionIndex >= 0 &&
        selectedSuggestionIndex < filteredSuggestions.length
      ) {
        const selectedSuggestion = filteredSuggestions[selectedSuggestionIndex];
        setSearchQuery(selectedSuggestion);
        setShowSearchDropdown(false);
        setSelectedSuggestionIndex(-1);
        navigate(`/explore?q=${encodeURIComponent(selectedSuggestion)}`);
      } else if (searchQuery.trim()) {
        navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
      }
    } else if (e.key === "Escape") {
      setShowSearchDropdown(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [searchQuery]);

  return (
    <section
      id="hero-section"
      className="py-12 sm:py-16 md:py-32 opacity-0 transition-opacity duration-700"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-center lg:text-left lg:pl-0 mt-0 sm:-mt-8 lg:-mt-32">
            <div className="mb-4">
              <h1 className="text-[2.05rem] sm:text-[2.2rem] md:text-[2.75rem] font-poppins text-gray-900 mb-3 leading-tight max-w-[320px] sm:max-w-[420px] lg:max-w-none mx-auto lg:mx-0">
                <span className="font-light">Turn </span>
                <span className="font-bold">Questions</span>
                <span className="font-light"> Into </span>
                <span className="font-bold">Conversations</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 font-poppins font-light flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-0.5 sm:gap-2 mb-8 sm:mb-10">
                <span className="whitespace-nowrap">Get 1-on-1 advice on</span>
                <span className="inline-block min-w-[130px] sm:min-w-[180px] text-center sm:text-left">
                  <span className="text-matepeak-primary font-semibold">
                    {displayText}
                  </span>
                  <span className="animate-pulse text-matepeak-primary">|</span>
                </span>
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col justify-center lg:justify-start items-center lg:items-start mb-8 mt-6 sm:mt-8">
              <form
                onSubmit={handleSearch}
                className="relative w-full max-w-xl mb-4"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSearchDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => {
                        setShowSearchDropdown(false);
                        setSelectedSuggestionIndex(-1);
                      }, 200)
                    }
                    placeholder={
                      isMobileView
                        ? "What mentor are you interested in?"
                        : "What type of mentor are you interested in?"
                    }
                    className="w-full h-12 sm:h-14 pl-4 sm:pl-6 pr-12 sm:pr-14 rounded-full bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 text-gray-700 placeholder:text-xs sm:placeholder:text-sm placeholder:text-gray-500 outline-none hover:border-gray-300 focus:border-matepeak-primary focus:ring-2 focus:ring-matepeak-primary/20 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black flex items-center justify-center hover:bg-gray-800 transition-all shadow-sm"
                  >
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </button>
                </div>

                {/* Search Dropdown */}
                {showSearchDropdown && searchQuery.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {getFilteredSuggestions().map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowSearchDropdown(false);
                          setSelectedSuggestionIndex(-1);
                          navigate(
                            `/explore?q=${encodeURIComponent(suggestion)}`
                          );
                        }}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        className={`w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3 font-poppins ${
                          selectedSuggestionIndex === index
                            ? "bg-matepeak-primary/10 text-matepeak-primary"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <Search
                          className={`w-4 h-4 ${
                            selectedSuggestionIndex === index
                              ? "text-matepeak-primary"
                              : "text-gray-400"
                          }`}
                        />
                        <span className="text-sm">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {/* Popular Tags */}
              <div className="w-full max-w-xl">
                <div className="mx-auto lg:mx-0 flex w-fit items-center gap-1.5 sm:gap-2.5 flex-nowrap">
                  <span className="text-[11px] sm:text-sm font-bold text-gray-900 font-poppins whitespace-nowrap leading-none">
                    Try:
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                    {popularOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => handlePopularClick(option)}
                        className="h-6 sm:h-8 inline-flex items-center justify-center text-[10px] sm:text-sm px-2 sm:px-3.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-matepeak-primary hover:text-matepeak-primary transition-all font-poppins whitespace-nowrap leading-none"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:hidden overflow-hidden pt-2 relative">
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div className="flex gap-4 animate-scroll-left pt-8">
              {mentorCards.map((mentor) => (
                <div key={`mobile-${mentor.id}`} className="flex-shrink-0">
                  <div
                    className="bg-white rounded-2xl border border-gray-200/60 p-5 pt-14 w-56 h-56 relative"
                    style={{ boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)" }}
                  >
                    <div className="flex flex-col items-center h-full">
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white shadow-md absolute -top-8 left-1/2 -translate-x-1/2">
                        <img
                          src={mentor.image}
                          alt={mentor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1 font-poppins text-center">
                        {mentor.name}
                      </h3>
                      <p className="text-gray-500 text-xs mb-3 font-poppins text-center">
                        {mentor.title}
                      </p>
                      <div className="w-full border-t border-gray-100 pt-3 mt-auto text-center">
                        <span className="text-xs font-medium text-gray-700 font-poppins">
                          {mentor.company}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {mentorCards.map((mentor) => (
                <div key={`mobile-${mentor.id}-duplicate`} className="flex-shrink-0">
                  <div
                    className="bg-white rounded-2xl border border-gray-200/60 p-5 pt-14 w-56 h-56 relative"
                    style={{ boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)" }}
                  >
                    <div className="flex flex-col items-center h-full">
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white shadow-md absolute -top-8 left-1/2 -translate-x-1/2">
                        <img
                          src={mentor.image}
                          alt={mentor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1 font-poppins text-center">
                        {mentor.name}
                      </h3>
                      <p className="text-gray-500 text-xs mb-3 font-poppins text-center">
                        {mentor.title}
                      </p>
                      <div className="w-full border-t border-gray-100 pt-3 mt-auto text-center">
                        <span className="text-xs font-medium text-gray-700 font-poppins">
                          {mentor.company}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <p className="text-gray-600 text-sm font-poppins mb-4">
                Our experts are ready to help
              </p>
              <div className="flex items-center justify-center gap-3">
                {expertProfiles.map((expert, index) => (
                  <div
                    key={`mobile-expert-${expert.id}`}
                    className="relative"
                    style={{
                      marginLeft: index > 0 ? "-14px" : "0",
                      zIndex: expertProfiles.length - index,
                    }}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                      <img
                        src={expert.image}
                        alt={expert.name}
                        className="w-full h-full object-cover"
                        title={expert.name}
                      />
                    </div>
                  </div>
                ))}
                <div className="ml-1 text-xs font-medium text-gray-700 font-poppins">
                  and many more..
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block overflow-hidden pt-0 relative -mt-16">
            {/* Left fade gradient */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            {/* Right fade gradient */}
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div className="flex gap-6 animate-scroll-left hover:pause pt-12">
              {/* First set of cards */}
              {mentorCards.map((mentor) => (
                <div key={mentor.id} className="flex-shrink-0">
                  <div
                    className="bg-white rounded-2xl border border-gray-200/60 hover:border-gray-300 p-6 pt-16 w-64 h-64 relative transition-all duration-300 group hover:-translate-y-1"
                    style={{ boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)" }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-white shadow-md absolute -top-10 left-1/2 -translate-x-1/2 transition-all duration-300 group-hover:shadow-lg">
                        <img
                          src={mentor.image}
                          alt={mentor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 font-poppins">
                        {mentor.name}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 font-poppins">
                        {mentor.title}
                      </p>
                      <div className="w-full border-t border-gray-100 pt-3 mt-auto">
                        <div className="flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 font-poppins">
                            {mentor.company}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {mentorCards.map((mentor) => (
                <div key={`${mentor.id}-duplicate`} className="flex-shrink-0">
                  <div
                    className="bg-white rounded-2xl border border-gray-200/60 hover:border-gray-300 p-6 pt-16 w-64 h-64 relative transition-all duration-300 group hover:-translate-y-1"
                    style={{ boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1)" }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-white shadow-md absolute -top-10 left-1/2 -translate-x-1/2 transition-all duration-300 group-hover:shadow-lg">
                        <img
                          src={mentor.image}
                          alt={mentor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 font-poppins">
                        {mentor.name}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 font-poppins">
                        {mentor.title}
                      </p>
                      <div className="w-full border-t border-gray-100 pt-3 mt-auto">
                        <div className="flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 font-poppins">
                            {mentor.company}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Expert Profiles Section - Below Moving Cards */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm font-poppins mb-6">
                Our experts are ready to help
              </p>
              <div className="flex items-center justify-center gap-3">
                {expertProfiles.map((expert, index) => (
                  <div
                    key={expert.id}
                    className="relative"
                    style={{
                      marginLeft: index > 0 ? "-18px" : "0",
                      zIndex: expertProfiles.length - index,
                    }}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                      <img
                        src={expert.image}
                        alt={expert.name}
                        className="w-full h-full object-cover"
                        title={expert.name}
                      />
                    </div>
                  </div>
                ))}
                <div className="ml-2 text-sm font-medium text-gray-700 font-poppins">
                  and many more..
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
