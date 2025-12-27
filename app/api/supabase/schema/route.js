import { NextRequest, NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    let { url, key } = body;

    // Fall back to environment variables if not provided
    const envUrl = process.env.SUPABASE_PROJECT_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
    const envKey = process.env.SUPABASE_ANON || process.env.NEXT_PUBLIC_SUPABASE_ANON;
    
    url = url || envUrl;
    key = key || envKey;

    if (!url || !key) {
      return NextResponse.json(
        { 
          error: "Supabase URL and key required",
          details: "Set SUPABASE_PROJECT_URL and SUPABASE_ANON environment variables or pass credentials in request body"
        },
        { status: 400 }
      );
    }

    const baseUrl = url.replace(/\/$/, "");

    // First, try to get tables using graphql introspection
    try {
      const introspectionResponse = await fetch(`${baseUrl}/graphql/v1`, {
        method: "POST",
        headers: {
          apikey,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query IntrospectionQuery {
              __schema {
                types {
                  name
                  kind
                }
              }
            }
          `,
        }),
      });

      if (introspectionResponse.ok) {
        const introspectionData = await introspectionResponse.json();
        const tables = introspectionData?.data?.__schema?.types
          ?.filter((t) => !t.name.startsWith("_") && t.kind === "OBJECT")
          .map((t) => t.name) || [];

        return NextResponse.json({
          tables: tables.slice(0, 50),
          columns: {},
          source: "graphql",
        });
      }
    } catch (err) {
      console.log("GraphQL introspection failed, trying REST API");
    }

    // Fallback: Try REST API with information_schema (might fail if no permissions)
    try {
      const response = await fetch(`${baseUrl}/rest/v1/?apiversion=1`, {
        headers: {
          apikey,
          Authorization: `Bearer ${key}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          tables: Object.keys(data || {}).slice(0, 50),
          columns: {},
          source: "rest",
        });
      }
    } catch (err) {
      console.log("REST API list failed");
    }

    // Last resort: Return empty schema but success
    return NextResponse.json({
      tables: [],
      columns: {},
      source: "fallback",
      note: "Could not retrieve schema. This may be due to permission restrictions on the Supabase anon key. Consider using the service role key instead.",
    });
  } catch (error) {
    console.error("Schema fetch error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch Supabase schema",
        details: error instanceof Error ? error.message : "Unknown error",
        tables: [], 
        columns: {},
      },
      { status: 200 }
    );
  }
}
