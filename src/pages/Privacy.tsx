import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-8 tracking-tight">Privacy Policy</h1>
        
        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="italic">Last Updated: March 4, 2026</p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">1. Information We Collect</h2>
            <p>At Tahir GPT, we prioritize your privacy. We collect minimal information necessary to provide our services:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account Information:</strong> Email address and encrypted credentials.</li>
              <li><strong>Usage Data:</strong> Conversation history and generated assets (images, websites) to allow you to access them across sessions.</li>
              <li><strong>Technical Data:</strong> IP address and browser information for security and performance optimization.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">2. AI Data Processing</h2>
            <p>Your inputs are processed by advanced AI models (including Google Gemini). While we use this data to generate responses, we do not sell your personal data to third parties. Your data is used solely to improve the Tahir GPT experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">3. Data Security & Storage</h2>
            <p>We implement industry-standard security measures to protect your data. Local data is stored in your browser's secure storage, while account-linked data is stored on encrypted cloud servers. We recommend using strong, unique passwords.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">4. Sharing & Third Parties</h2>
            <p>We do not share your personal information with third parties except as required by law or to provide the core services (e.g., AI processing). Generated content shared by you via our sharing tools is subject to the privacy policies of the destination platforms (e.g., WhatsApp, Telegram).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">5. User Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access and export your data.</li>
              <li>Request deletion of your account and all associated data.</li>
              <li>Opt-out of non-essential data collection.</li>
            </ul>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 dark:border-zinc-700">
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-bold">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
