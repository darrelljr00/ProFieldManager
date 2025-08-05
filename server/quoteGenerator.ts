// Helper functions for generating quote documents

// Helper function to generate HTML content for quotes
export function generateQuoteHTML(quote: any): string {
  const currentDate = new Date().toLocaleDateString();
  const lineItemsHTML = quote.lineItems?.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description || ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${parseFloat(item.price || 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; }
        .quote-info { margin-bottom: 30px; }
        .customer-info { margin-bottom: 30px; }
        .line-items table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .line-items th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
        .summary { text-align: right; margin-top: 30px; }
        .summary table { margin-left: auto; }
        .summary td { padding: 5px 15px; }
        .total-row { font-weight: bold; border-top: 2px solid #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>QUOTE</h1>
        <h2>Quote #${quote.quoteNumber}</h2>
      </div>
      
      <div class="quote-info">
        <p><strong>Date:</strong> ${new Date(quote.quoteDate).toLocaleDateString()}</p>
        <p><strong>Valid Until:</strong> ${new Date(quote.expiryDate).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${quote.status.toUpperCase()}</p>
      </div>
      
      <div class="customer-info">
        <h3>Quote For:</h3>
        <p><strong>${quote.customer?.name || 'N/A'}</strong></p>
        <p>${quote.customer?.email || ''}</p>
        <p>${quote.customer?.phone || ''}</p>
        <p>${quote.customer?.address || ''}</p>
      </div>
      
      <div class="line-items">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Quantity</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHTML}
          </tbody>
        </table>
      </div>
      
      <div class="summary">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td>$${parseFloat(quote.subtotal || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax (${parseFloat(quote.taxRate || 0)}%):</td>
            <td>$${parseFloat(quote.taxAmount || 0).toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>Total:</td>
            <td>$${parseFloat(quote.total || 0).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      ${quote.notes ? `
        <div style="margin-top: 40px;">
          <h3>Notes:</h3>
          <p>${quote.notes}</p>
        </div>
      ` : ''}
      
      <div style="margin-top: 60px; text-align: center; color: #666; font-size: 12px;">
        <p>Generated on ${currentDate}</p>
      </div>
    </body>
    </html>
  `;
}

// Helper function to generate Word content for quotes
export function generateQuoteWordContent(quote: any): string {
  const currentDate = new Date().toLocaleDateString();
  const lineItemsHTML = quote.lineItems?.map((item: any) => `
    <tr>
      <td>${item.description || ''}</td>
      <td style="text-align: center;">${item.quantity || 0}</td>
      <td style="text-align: right;">$${parseFloat(item.price || 0).toFixed(2)}</td>
      <td style="text-align: right;">$${(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  return `
    <div style="font-family: Arial, sans-serif; margin: 40px;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1>QUOTE</h1>
        <h2>Quote #${quote.quoteNumber}</h2>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p><strong>Date:</strong> ${new Date(quote.quoteDate).toLocaleDateString()}</p>
        <p><strong>Valid Until:</strong> ${new Date(quote.expiryDate).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${quote.status.toUpperCase()}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h3>Quote For:</h3>
        <p><strong>${quote.customer?.name || 'N/A'}</strong></p>
        <p>${quote.customer?.email || ''}</p>
        <p>${quote.customer?.phone || ''}</p>
        <p>${quote.customer?.address || ''}</p>
      </div>
      
      <table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px; text-align: left;">Description</th>
            <th style="padding: 12px; text-align: center;">Quantity</th>
            <th style="padding: 12px; text-align: right;">Price</th>
            <th style="padding: 12px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
      </table>
      
      <div style="text-align: right; margin-top: 30px;">
        <table style="margin-left: auto;">
          <tr>
            <td style="padding: 5px 15px;">Subtotal:</td>
            <td style="padding: 5px 15px;">$${parseFloat(quote.subtotal || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 15px;">Tax (${parseFloat(quote.taxRate || 0)}%):</td>
            <td style="padding: 5px 15px;">$${parseFloat(quote.taxAmount || 0).toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 2px solid #333;">
            <td style="padding: 5px 15px;">Total:</td>
            <td style="padding: 5px 15px;">$${parseFloat(quote.total || 0).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      ${quote.notes ? `
        <div style="margin-top: 40px;">
          <h3>Notes:</h3>
          <p>${quote.notes}</p>
        </div>
      ` : ''}
      
      <div style="margin-top: 60px; text-align: center; color: #666; font-size: 12px;">
        <p>Generated on ${currentDate}</p>
      </div>
    </div>
  `;
}