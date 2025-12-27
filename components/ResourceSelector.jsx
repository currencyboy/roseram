'use client';

import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, ChevronDown } from 'lucide-react';

export function ResourceSelector({
  label,
  placeholder,
  resources = [],
  loading = false,
  error = null,
  selectedId = null,
  onSelect,
  renderOption,
  renderSelected,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResources = resources.filter(resource => {
    let text = '';
    if (renderOption) {
      const rendered = renderOption(resource);
      text = (rendered?.text || '') || '';
    } else {
      text = (resource?.name || resource?.id || '') || '';
    }
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedResource = resources.find(r => r.id === selectedId);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        {/* Selected Value Display */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading || resources.length === 0}
          className={`w-full px-4 py-3 text-left border rounded-lg transition-all flex items-center justify-between ${
            isOpen
              ? 'border-blue-500 ring-2 ring-blue-200 bg-white'
              : 'border-gray-300 hover:border-gray-400 bg-white'
          } ${loading || resources.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : selectedResource ? (
              <div>
                {renderSelected ? renderSelected(selectedResource) : (
                  <div>
                    <p className="text-gray-900 font-medium truncate">
                      {selectedResource.name || selectedResource.id}
                    </p>
                    {selectedResource.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {selectedResource.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">{placeholder}</p>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto">
              {error ? (
                <div className="p-3 text-red-600 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              ) : filteredResources.length > 0 ? (
                <div className="space-y-1 p-2">
                  {filteredResources.map((resource) => {
                    const option = renderOption ? renderOption(resource) : { text: resource.name || resource.id };
                    return (
                      <button
                        key={resource.id}
                        onClick={() => {
                          onSelect(resource);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                          selectedId === resource.id
                            ? 'bg-blue-100 text-blue-900 font-medium'
                            : 'text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <p className="font-medium">{option.text}</p>
                        {option.subtitle && (
                          <p className="text-xs text-gray-500 mt-0.5">{option.subtitle}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-gray-500 text-sm text-center">
                  No resources found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && !isOpen && (
        <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
