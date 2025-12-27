'use client';

import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  Check,
  Loader,
  AlertCircle,
  Code,
  Database,
  Mail,
  CheckCircle,
} from 'lucide-react';

const FRAMEWORKS = [
  {
    id: 'next',
    name: 'Next.js',
    description: 'React framework with built-in routing and SSR',
    icon: null,
    recommended: true,
    template: 'next-js',
  },
  {
    id: 'react',
    name: 'React',
    description: 'JavaScript library for building user interfaces',
    icon: null,
    recommended: true,
    template: 'vite-react',
  },
  {
    id: 'vite',
    name: 'Vite',
    description: 'Fast frontend build tool',
    icon: null,
    recommended: false,
    template: 'vite',
  },
  {
    id: 'vue',
    name: 'Vue.js',
    description: 'Progressive JavaScript framework',
    icon: null,
    recommended: false,
    template: 'vite-vue',
  },
  {
    id: 'svelte',
    name: 'Svelte',
    description: 'Compiler framework for building UIs',
    icon: null,
    recommended: false,
    template: 'vite-svelte',
  },
  {
    id: 'html',
    name: 'Static HTML',
    description: 'Plain HTML, CSS, and JavaScript',
    icon: null,
    recommended: false,
    template: 'html',
  },
];

const DATABASES = [
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'PostgreSQL database with authentication',
    icon: null,
    mcp: true,
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Serverless PostgreSQL database',
    icon: null,
    mcp: true,
  },
  {
    id: 'prisma',
    name: 'Prisma ORM',
    description: 'Type-safe database ORM',
    icon: null,
    mcp: true,
  },
  {
    id: 'firebase',
    name: 'Firebase',
    description: 'Real-time database and backend',
    icon: null,
    mcp: false,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'NoSQL document database',
    icon: null,
    mcp: false,
  },
  {
    id: 'none',
    name: 'Skip for now',
    description: 'No database integration',
    icon: null,
    mcp: false,
  },
];

const EMAIL_SERVICES = [
  {
    id: 'resend',
    name: 'Resend',
    description: 'Email API for developers',
    icon: null,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Email delivery platform',
    icon: null,
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    description: 'Email validation and delivery',
    icon: null,
  },
  {
    id: 'nodemailer',
    name: 'Nodemailer',
    description: 'Node.js email library',
    icon: null,
  },
  {
    id: 'none',
    name: 'Skip for now',
    description: 'No email integration',
    icon: null,
  },
];

export function ProjectSetupModal({ isOpen, onClose, onProjectCreate, loading = false }) {
  const [step, setStep] = useState('framework'); // framework, database, email, review, creating
  const [framework, setFramework] = useState(null);
  const [database, setDatabase] = useState(null);
  const [emailService, setEmailService] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState(null);

  const handleFrameworkSelect = (fw) => {
    setFramework(fw);
    setError(null);
  };

  const handleDatabaseSelect = (db) => {
    setDatabase(db);
    setError(null);
  };

  const handleEmailSelect = (email) => {
    setEmailService(email);
    setError(null);
  };

  const handleNext = () => {
    if (step === 'framework') {
      if (!framework) {
        setError('Please select a framework');
        return;
      }
      setStep('database');
    } else if (step === 'database') {
      setStep('email');
    } else if (step === 'email') {
      setStep('review');
    } else if (step === 'review') {
      if (!projectName.trim()) {
        setError('Project name is required');
        return;
      }
      handleCreateProject();
    }
  };

  const handlePrev = () => {
    if (step === 'review') setStep('email');
    else if (step === 'email') setStep('database');
    else if (step === 'database') setStep('framework');
  };

  const handleCreateProject = async () => {
    setStep('creating');
    try {
      await onProjectCreate({
        name: projectName,
        framework: framework?.id,
        database: database?.id,
        emailService: emailService?.id,
      });
    } catch (err) {
      setError(err.message || 'Failed to create project');
      setStep('review');
    }
  };

  if (!isOpen) return null;

  const selectedDb = database || DATABASES[DATABASES.length - 1];
  const selectedEmail = emailService || EMAIL_SERVICES[EMAIL_SERVICES.length - 1];
  const databaseConfig = DATABASES.find(db => db.id === selectedDb.id);
  const emailConfig = EMAIL_SERVICES.find(e => e.id === selectedEmail.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
          <h2 className="text-xl font-bold">Create New Project</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white hover:bg-blue-800 rounded p-1 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm">
          {['framework', 'database', 'email', 'review'].map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors ${
                  ['framework', 'database', 'email', 'review'].indexOf(step) > idx
                    ? 'bg-green-500 text-white'
                    : ['framework', 'database', 'email', 'review'].indexOf(step) === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {['framework', 'database', 'email', 'review'].indexOf(step) > idx ? (
                  <Check className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 3 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {step === 'framework' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Choose your framework</h3>
                <p className="text-sm text-gray-600 mb-4">Select the framework that best fits your project</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {FRAMEWORKS.map((fw) => (
                  <div
                    key={fw.id}
                    onClick={() => handleFrameworkSelect(fw)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      framework?.id === fw.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{fw.name}</h4>
                          {fw.recommended && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{fw.description}</p>
                      </div>
                      {framework?.id === fw.id && (
                        <div className="text-blue-600 mt-1">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'database' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Choose a database (optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">Add database integration to your project</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {DATABASES.map((db) => (
                  <div
                    key={db.id}
                    onClick={() => handleDatabaseSelect(db)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      database?.id === db.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{db.name}</h4>
                          {db.mcp && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                              MCP
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{db.description}</p>
                      </div>
                      {database?.id === db.id && (
                        <div className="text-blue-600 mt-1">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'email' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Choose an email service (optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">Add email functionality to your project</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {EMAIL_SERVICES.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailSelect(email)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      emailService?.id === email.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{email.name}</h4>
                        <p className="text-sm text-gray-600">{email.description}</p>
                      </div>
                      {emailService?.id === email.id && (
                        <div className="text-blue-600 mt-1">
                          <Check className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Project Details</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="my-awesome-project"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Use lowercase letters, numbers, and hyphens only
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Configuration Summary</h3>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl mb-2 flex items-center gap-2">
                      <Code className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{framework?.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{framework?.description}</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm mb-2 font-medium text-gray-600">Database</div>
                    <h4 className="font-bold text-gray-900 text-sm">{databaseConfig?.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{databaseConfig?.description}</p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl mb-2">
                      {emailConfig?.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">{emailConfig?.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">{emailConfig?.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'creating' && (
            <div className="p-6 flex flex-col items-center justify-center min-h-64">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-900 font-medium">Creating your project...</p>
              <p className="text-sm text-gray-600 mt-2">Setting up {framework?.name} with {databaseConfig?.name}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'creating' && (
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end bg-gray-50">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>

            {step !== 'framework' && (
              <button
                onClick={handlePrev}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={loading || (step === 'framework' && !framework)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading && step === 'creating' ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : step === 'review' ? (
                <>
                  <Check className="w-4 h-4" />
                  Create Project
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
