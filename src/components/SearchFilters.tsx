
import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAISearch } from "@/hooks/useAISearch";
import { toast } from "@/components/ui/sonner";

interface SearchFiltersProps {
  onSearch: (filters: any) => void;
}

const SearchFilters = ({ onSearch }: SearchFiltersProps) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { searchMentors, isLoading, error } = useAISearch();

  const categories = [
    { id: "academic", label: "Academic Support" },
    { id: "career", label: "Career Guidance" },
    { id: "wellness", label: "Wellness & Fitness" },
    { id: "interview", label: "Mock Interviews" },
    { id: "project", label: "Project Feedback" },
  ];

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      try {
        console.log("Initiating AI search for:", searchTerm);
        const results = await searchMentors(searchTerm);
        if (results && results.length > 0) {
          toast.success(`Found ${results.length} mentors that match your search`);
          onSearch({
            searchTerm,
            priceRange,
            categories: selectedCategories,
            aiResults: results
          });
        } else {
          toast.info("No mentors found for your search. Try different keywords.");
          onSearch({
            searchTerm,
            priceRange,
            categories: selectedCategories,
            aiResults: []
          });
        }
      } catch (error) {
        console.error("Search error:", error);
        // AI search not available, fallback to standard search silently
        onSearch({
          searchTerm,
          priceRange,
          categories: selectedCategories
        });
      }
    } else {
      onSearch({
        searchTerm,
        priceRange,
        categories: selectedCategories
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setPriceRange([0, 2000]);
    setSelectedCategories([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search using AI - describe what you're looking for..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          className="bg-matepeak-dark hover:bg-matepeak-secondary text-white"
          disabled={isLoading}
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="md:w-auto w-full flex items-center gap-2 border-gray-300"
        >
          <Filter size={16} />
          {isFiltersOpen ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {isFiltersOpen && (
        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-800">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={14} />
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Categories</h4>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center">
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleCategoryChange(category.id)}
                    />
                    <Label htmlFor={category.id} className="ml-2 cursor-pointer">
                      {category.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Price Range (₹)</h4>
              <Slider
                value={priceRange}
                min={0}
                max={2000}
                step={100}
                onValueChange={setPriceRange}
                className="my-6"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>₹{priceRange[0]}</span>
                <span>₹{priceRange[1]}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSearch}
              className="bg-matepeak-dark hover:bg-matepeak-secondary text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
