import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ToastNotifications() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Define default options
        duration: 4000,
        style: {
          background: '#111827', // gray-900
          color: '#f3f4f6', // gray-100
          border: '1px solid #1f2937', // gray-800
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.5)'
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981', // emerald-500
            secondary: '#111827'
          }
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444', // red-500
            secondary: '#111827'
          }
        }
      }}
    />
  );
}
