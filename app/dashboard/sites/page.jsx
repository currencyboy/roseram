'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, Edit, Trash2, Eye, Settings, Globe, Grid2X2, List } from 'lucide-react';

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchSites();
  }, []);

  async function fetchSites() {
    try {
      setLoading(true);
      setError(null);
      setSites([
        {
          id: '1',
          name: 'My First Site',
          slug: 'my-first-site',
          url: 'https://my-first-site.netlify.app',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pages: 0,
        },
      ]);
    } catch (err) {
      setError('Failed to load sites');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSite(siteId) {
    try {
      setSites(sites.filter(s => s.id !== siteId));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete site');
      console.error(err);
    }
  }

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout currentPage="sites">
      <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Sites</h1>
              <p className="text-blue-100">Manage and build your websites</p>
            </div>
            <Link
              href="/dashboard/sites/new"
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <Plus className="w-5 h-5" />
              New Site
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                title="Grid view"
              >
                <Grid2X2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                title="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading sites...</p>
              </div>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {sites.length === 0 ? 'No sites yet' : 'No sites match your search'}
              </h3>
              <p className="text-gray-600 mb-6">
                {sites.length === 0
                  ? 'Create your first site to get started'
                  : 'Try adjusting your search criteria'}
              </p>
              {sites.length === 0 && (
                <Link
                  href="/dashboard/sites/new"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Your First Site
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSites.map(site => (
                <SiteCard key={site.id} site={site} onDelete={deleteSite} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredSites.map(site => (
                  <SiteListItem key={site.id} site={site} onDelete={deleteSite} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Site?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All pages and content will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSite(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function SiteCard({ site, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600"></div>

      {/* Content */}
      <div className="p-6 pt-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{site.name}</h3>
        <p className="text-sm text-gray-600 mb-4">{site.slug}</p>

        {/* Stats */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="text-sm">
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">{site.pages || 0}</span> pages
            </p>
            <p className="text-gray-600">
              Status: <span className={`font-semibold ${site.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                {site.status === 'published' ? '✓ Published' : 'Draft'}
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/dashboard/sites/${site.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          {site.url && (
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              <Eye className="w-4 h-4" />
              View
            </a>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-gray-900 font-medium mb-3">Delete this site?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(site.id);
                  setDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SiteListItem({ site, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{site.name}</h3>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>/{site.slug}</span>
            <span>{site.pages || 0} pages</span>
            <span className={site.status === 'published' ? 'text-green-600' : 'text-yellow-600'}>
              {site.status === 'published' ? '✓ Published' : 'Draft'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/sites/${site.id}`}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="w-5 h-5" />
          </Link>
          {site.url && (
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="View"
            >
              <Eye className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {deleteConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg text-center">
            <p className="text-gray-900 font-medium mb-3">Delete this site?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(site.id);
                  setDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
