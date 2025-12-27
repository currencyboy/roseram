import { NextRequest, NextResponse } from "next/server";

interface NetlifyFile {
  file: string;
  data: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, token, html, css, javascript } = body;

    if (!siteId || !token) {
      return NextResponse.json(
        { error: "Missing Netlify credentials" },
        { status: 400 }
      );
    }

    const files: NetlifyFile[] = [
      {
        file: "index.html",
        data: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <style>
${css}
  </style>
</head>
<body>
${html}
  <script>
${javascript}
  </script>
</body>
</html>`,
      },
    ];

    const deployPayload = {
      files: files.reduce(
        (acc, f) => {
          acc[f.file] = f.data;
          return acc;
        },
        {} as Record<string, string>
      ),
    };

    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deployPayload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Netlify deployment failed: ${error}` },
        { status: response.status }
      );
    }

    const deployment = await response.json();

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        url: deployment.url,
        status: deployment.state,
      },
    });
  } catch (error) {
    console.error("Netlify deployment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Deployment failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
