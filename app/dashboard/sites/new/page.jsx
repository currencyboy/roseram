'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ChevronLeft, Loader } from 'lucide-react';

export default function NewSitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  function generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);
  }

  function handleNameChange(name) {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Site name is required');
      }

      if (!formData.slug.trim()) {
        throw new Error('Site slug is required');
      }

      setTimeout(() => {
        router.push('/dashboard/sites');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
      setLoading(false);
    }
  }

  return (
    <DashboardLayout currentPage="sites">
      <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <Link href="/dashboard/sites" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Sites
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Site</h1>
          <p className="text-gray-600">Set up a new website project</p>
        </div>

        {/* Main Content */}
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Site Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                    Site Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., My Awesome Website"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    The name of your website project
                  </p>
                </div>

                {/* Site Slug */}
                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-900 mb-2">
                    Site Slug *
                  </label>
                  <input
                    id="slug"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="my-awesome-website"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    URL-friendly identifier (lowercase, hyphens only)
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your website project..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    A brief description of your website
                  </p>
                </div>

                {/* Info Card */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Your site will be created and ready to edit</li>
                    <li>✓ You can add pages and customize your design</li>
                    <li>✓ Generate pages using AI</li>
                    <li>✓ Deploy to Netlify or GitHub when ready</li>
                  </ul>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Link
                    href="/dashboard/sites"
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Site'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
