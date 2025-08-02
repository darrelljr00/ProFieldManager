import React from 'react';

interface InvoicePreviewProps {
  template: string;
  logoPosition: string;
  showSquareFeet: boolean;
  squareFeetLabel: string;
}

const templateStyles = {
  classic: {
    backgroundColor: '#ffffff',
    headerColor: '#1f2937',
    accentColor: '#374151',
    textColor: '#111827',
    borderColor: '#e5e7eb'
  },
  modern: {
    backgroundColor: '#ffffff',
    headerColor: '#6b7280',
    accentColor: '#9ca3af',
    textColor: '#374151',
    borderColor: '#d1d5db'
  },
  corporate: {
    backgroundColor: '#ffffff',
    headerColor: '#2563eb',
    accentColor: '#3b82f6',
    textColor: '#1e40af',
    borderColor: '#bfdbfe'
  },
  elegant: {
    backgroundColor: '#f9fafb',
    headerColor: '#374151',
    accentColor: '#6b7280',
    textColor: '#111827',
    borderColor: '#e5e7eb'
  },
  creative: {
    backgroundColor: '#ffffff',
    headerColor: '#7c3aed',
    accentColor: '#8b5cf6',
    textColor: '#5b21b6',
    borderColor: '#ddd6fe'
  },
  simple: {
    backgroundColor: '#ffffff',
    headerColor: '#059669',
    accentColor: '#10b981',
    textColor: '#047857',
    borderColor: '#a7f3d0'
  },
  bold: {
    backgroundColor: '#ffffff',
    headerColor: '#dc2626',
    accentColor: '#ef4444',
    textColor: '#b91c1c',
    borderColor: '#fecaca'
  },
  luxury: {
    backgroundColor: '#fffbeb',
    headerColor: '#d97706',
    accentColor: '#f59e0b',
    textColor: '#92400e',
    borderColor: '#fed7aa'
  },
  tech: {
    backgroundColor: '#f0f9ff',
    headerColor: '#0891b2',
    accentColor: '#06b6d4',
    textColor: '#0e7490',
    borderColor: '#bae6fd'
  },
  vintage: {
    backgroundColor: '#fefdf8',
    headerColor: '#92400e',
    accentColor: '#b45309',
    textColor: '#78350f',
    borderColor: '#fed7aa'
  }
};

export function InvoicePreview({ template, logoPosition, showSquareFeet, squareFeetLabel }: InvoicePreviewProps) {
  const style = templateStyles[template] || templateStyles.classic;
  
  const logoElement = (
    <div 
      className="w-16 h-16 rounded flex items-center justify-center text-white text-xs font-bold"
      style={{ backgroundColor: style.headerColor }}
    >
      LOGO
    </div>
  );

  const getLogoPosition = () => {
    const positions = {
      'top-left': 'flex justify-start',
      'top-center': 'flex justify-center',
      'top-right': 'flex justify-end',
      'bottom-left': 'flex justify-start',
      'bottom-center': 'flex justify-center',
      'bottom-right': 'flex justify-end'
    };
    return positions[logoPosition] || positions['top-left'];
  };

  const isBottomLogo = logoPosition.includes('bottom');

  return (
    <div 
      className="w-full max-w-2xl mx-auto p-6 border rounded-lg shadow-sm"
      style={{ 
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.textColor
      }}
    >
      {/* Header with Logo */}
      {!isBottomLogo && (
        <div className={`mb-6 ${getLogoPosition()}`}>
          {logoElement}
        </div>
      )}
      
      {/* Invoice Header */}
      <div className="mb-6">
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ color: style.headerColor }}
        >
          INVOICE
        </h1>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">Pro Field Manager Inc.</p>
            <p className="text-sm">123 Business Street</p>
            <p className="text-sm">City, ST 12345</p>
            <p className="text-sm">Phone: (555) 123-4567</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Invoice #: 2025-001</p>
            <p className="text-sm">Date: June 30, 2025</p>
            <p className="text-sm">Due Date: July 30, 2025</p>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="mb-6">
        <h3 
          className="font-semibold mb-2 pb-1 border-b"
          style={{ 
            color: style.accentColor,
            borderColor: style.borderColor
          }}
        >
          Bill To:
        </h3>
        <p className="font-semibold">John Smith</p>
        <p className="text-sm">456 Customer Lane</p>
        <p className="text-sm">Customer City, ST 67890</p>
      </div>

      {/* Services Table */}
      <div className="mb-6">
        <table className="w-full">
          <thead>
            <tr 
              className="border-b-2"
              style={{ borderColor: style.borderColor }}
            >
              <th 
                className="text-left py-2 font-semibold"
                style={{ color: style.headerColor }}
              >
                Description
              </th>
              <th 
                className="text-right py-2 font-semibold"
                style={{ color: style.headerColor }}
              >
                Qty
              </th>
              {showSquareFeet && (
                <th 
                  className="text-right py-2 font-semibold"
                  style={{ color: style.headerColor }}
                >
                  {squareFeetLabel}
                </th>
              )}
              <th 
                className="text-right py-2 font-semibold"
                style={{ color: style.headerColor }}
              >
                Rate
              </th>
              <th 
                className="text-right py-2 font-semibold"
                style={{ color: style.headerColor }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b" style={{ borderColor: style.borderColor }}>
              <td className="py-2">Professional Cleaning Service</td>
              <td className="text-right py-2">1</td>
              {showSquareFeet && (
                <td className="text-right py-2">2,500</td>
              )}
              <td className="text-right py-2">$150.00</td>
              <td className="text-right py-2">$150.00</td>
            </tr>
            <tr className="border-b" style={{ borderColor: style.borderColor }}>
              <td className="py-2">Deep Carpet Cleaning</td>
              <td className="text-right py-2">3</td>
              {showSquareFeet && (
                <td className="text-right py-2">800</td>
              )}
              <td className="text-right py-2">$75.00</td>
              <td className="text-right py-2">$225.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span>Subtotal:</span>
            <span>$375.00</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax (8.25%):</span>
            <span>$30.94</span>
          </div>
          <div 
            className="flex justify-between py-2 border-t font-bold text-lg"
            style={{ 
              borderColor: style.borderColor,
              color: style.headerColor
            }}
          >
            <span>Total:</span>
            <span>$405.94</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-sm text-center">
        <p>Thank you for your business!</p>
        <p>Payment is due within 30 days of invoice date.</p>
      </div>

      {/* Bottom Logo */}
      {isBottomLogo && (
        <div className={`mt-6 ${getLogoPosition()}`}>
          {logoElement}
        </div>
      )}
    </div>
  );
}