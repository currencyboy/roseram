'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import VisualPageBuilder from '@/components/PageBuilder';

export default function SiteEditorPage() {
  const params = useParams();
  const siteId = params.id;
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSite();
  }, [siteId]);

  async function fetchSite() {
    try {
      setLoading(true);
      setSite({
        id: siteId,
        name: 'My First Site',
        slug: 'my-first-site',
        content: '',
      });
    } catch (err) {
      setError('Failed to load site');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Site not found'}</p>
          <a href="/dashboard/sites" className="text-blue-600 hover:underline">
            Back to Sites
          </a>
        </div>
      </div>
    );
  }

  return <VisualPageBuilder site={site} />;
}
