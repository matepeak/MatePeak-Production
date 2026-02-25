import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

/**
 * Debug component to diagnose why mentors are not loading
 * Add this to your Explore page temporarily: <MentorFetchDebug />
 */
export function MentorFetchDebug() {
  const [tests, setTests] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const results: any[] = [];

    // Test 1: Check Supabase connection
    try {
      const { data, error } = await supabase.auth.getSession();
      results.push({
        name: "Supabase Connection",
        status: error ? "error" : "success",
        message: error ? error.message : "Connected",
        details: data?.session ? "Authenticated" : "Anonymous",
      });
    } catch (e: any) {
      results.push({
        name: "Supabase Connection",
        status: "error",
        message: e.message,
      });
    }

    // Test 2: Count expert_profiles
    try {
      const { count, error } = await supabase
        .from("expert_profiles")
        .select("*", { count: "exact", head: true });

      results.push({
        name: "Expert Profiles Count",
        status: error ? "error" : count === 0 ? "warning" : "success",
        message: error
          ? error.message
          : `Found ${count} mentor profiles`,
        details: count === 0 ? "No mentors in database OR RLS blocking" : null,
      });
    } catch (e: any) {
      results.push({
        name: "Expert Profiles Count",
        status: "error",
        message: e.message,
      });
    }

    // Test 3: Fetch sample mentors
    try {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("id, full_name, category, created_at")
        .limit(5);

      results.push({
        name: "Fetch Sample Mentors",
        status: error ? "error" : !data || data.length === 0 ? "warning" : "success",
        message: error
          ? error.message
          : `Fetched ${data?.length || 0} mentors`,
        details: data ? JSON.stringify(data.map(m => ({ id: m.id, name: m.full_name })), null, 2) : null,
      });
    } catch (e: any) {
      results.push({
        name: "Fetch Sample Mentors",
        status: "error",
        message: e.message,
      });
    }

    // Test 4: Check profiles table
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      results.push({
        name: "Profiles Table",
        status: error ? "error" : "success",
        message: error ? error.message : `${count} profiles found`,
      });
    } catch (e: any) {
      results.push({
        name: "Profiles Table",
        status: "error",
        message: e.message,
      });
    }

    // Test 5: Test fetchMentorCards function
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/expert_profiles?select=id&limit=1`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await response.json();

      results.push({
        name: "Direct API Call",
        status: response.ok ? "success" : "error",
        message: response.ok
          ? `API accessible (${data.length} results)`
          : `HTTP ${response.status}: ${response.statusText}`,
        details: !response.ok ? JSON.stringify(data, null, 2) : null,
      });
    } catch (e: any) {
      results.push({
        name: "Direct API Call",
        status: "error",
        message: e.message,
      });
    }

    setTests(results);
    setRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  };

  return (
    <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-yellow-900">
          🔍 Mentor Fetch Diagnostics
        </h3>
        <Button
          onClick={runTests}
          disabled={running}
          variant="outline"
          size="sm"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-run Tests"}
        </Button>
      </div>

      <div className="space-y-3">
        {tests.map((test, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border"
          >
            {getIcon(test.status)}
            <div className="flex-1">
              <div className="font-medium text-sm">{test.name}</div>
              <div className="text-sm text-gray-600">{test.message}</div>
              {test.details && (
                <pre className="text-xs mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                  {test.details}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>

      {tests.some(t => t.status === "error" || t.status === "warning") && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-bold text-red-900 mb-2">⚠️ Issues Detected</h4>
          <p className="text-sm text-red-800 mb-2">
            Mentors are not loading. Most common causes:
          </p>
          <ol className="text-sm text-red-800 list-decimal list-inside space-y-1">
            <li>RLS policies blocking public read access</li>
            <li>No mentors in database</li>
            <li>Network/connection issues</li>
          </ol>
          <p className="text-sm text-red-800 mt-3 font-medium">
            📖 See <code className="bg-red-100 px-1 rounded">FIX_MENTOR_FETCHING.md</code> for solutions
          </p>
        </div>
      )}

      {tests.every(t => t.status === "success") && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-bold text-green-900">✅ All Tests Passed</h4>
          <p className="text-sm text-green-800">
            Supabase connection is working and mentors are accessible. 
            If mentors still don't show on the page, check the frontend filters or rendering logic.
          </p>
        </div>
      )}
    </Card>
  );
}

export default MentorFetchDebug;
