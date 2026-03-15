// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Generating embedding for query:', query);

    // Generate embedding for search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    console.log('Searching for similar mentors...');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search for similar mentors using vector similarity
    const { data: similarMentors, error: searchError } = await supabase.rpc(
      'search_mentors',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
      
      // Fallback to regular search if vector search fails
      const { data: fallbackMentors, error: fallbackError } = await supabase
        .from('expert_profiles')
        .select(`
          *,
          profile:profiles(full_name, email, avatar_url),
          reviews(rating)
        `)
        .ilike('bio', `%${query}%`)
        .limit(limit);

      if (fallbackError) {
        throw fallbackError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: fallbackMentors || [],
          fallback: true,
          message: 'AI search not available, showing keyword results'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found', similarMentors?.length || 0, 'mentors');

    return new Response(
      JSON.stringify({
        success: true,
        data: similarMentors || [],
        fallback: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ai-search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
