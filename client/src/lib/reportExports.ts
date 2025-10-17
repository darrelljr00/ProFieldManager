import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Excel Export Functions
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Report') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// PDF Export Functions
export const exportTableToPDF = (
  data: any[], 
  columns: string[], 
  filename: string,
  title: string
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
  
  // Prepare table data
  const headers = [columns];
  const body = data.map(row => 
    columns.map(col => {
      const key = col.toLowerCase().replace(/ /g, '');
      return row[key] ?? row[col] ?? '';
    })
  );
  
  // Add table
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] }
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportChartDataToPDF = (
  chartData: any[],
  chartTitle: string,
  filename: string,
  dataKeys: string[]
) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(chartTitle, 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
  
  // Prepare headers from data keys
  const headers = [['Period', ...dataKeys.map(key => 
    key.charAt(0).toUpperCase() + key.slice(1)
  )]];
  
  // Prepare body data
  const body = chartData.map(item => {
    const period = item.month || item.date || item.name || item.week || 'N/A';
    const values = dataKeys.map(key => {
      const value = item[key];
      if (typeof value === 'number') {
        return value.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
      }
      return value ?? '0';
    });
    return [period, ...values];
  });
  
  // Add table
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 30,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 139, 202] }
  });
  
  doc.save(`${filename}.pdf`);
};

// Sales Report Exports
export const exportSalesReport = (data: any[], format: 'excel' | 'pdf') => {
  const formattedData = data.map(item => ({
    Month: item.month,
    Revenue: `$${item.revenue?.toFixed(2) || '0.00'}`,
    'Invoice Count': item.count || 0,
    Refunds: `$${item.refunds?.toFixed(2) || '0.00'}`
  }));
  
  if (format === 'excel') {
    exportToExcel(formattedData, 'sales-report', 'Sales Data');
  } else {
    exportTableToPDF(
      formattedData,
      ['Month', 'Revenue', 'Invoice Count', 'Refunds'],
      'sales-report',
      'Sales Report'
    );
  }
};

// Leads Report Exports
export const exportLeadsReport = (data: any[], format: 'excel' | 'pdf') => {
  const formattedData = data.map(item => ({
    Month: item.month,
    'Total Leads': item.total || 0,
    Converted: item.converted || 0,
    Qualified: item.qualified || 0,
    Lost: item.lost || 0,
    'Conversion Rate': `${((item.converted / item.total) * 100 || 0).toFixed(1)}%`
  }));
  
  if (format === 'excel') {
    exportToExcel(formattedData, 'leads-report', 'Leads Data');
  } else {
    exportTableToPDF(
      formattedData,
      ['Month', 'Total Leads', 'Converted', 'Qualified', 'Lost', 'Conversion Rate'],
      'leads-report',
      'Leads Report'
    );
  }
};

// Expenses Report Exports
export const exportExpensesReport = (data: any[], format: 'excel' | 'pdf') => {
  const formattedData = data.map(item => ({
    Month: item.month,
    Amount: `$${item.amount?.toFixed(2) || '0.00'}`,
    'Expense Count': item.count || 0
  }));
  
  if (format === 'excel') {
    exportToExcel(formattedData, 'expenses-report', 'Expenses Data');
  } else {
    exportTableToPDF(
      formattedData,
      ['Month', 'Amount', 'Expense Count'],
      'expenses-report',
      'Expenses Report'
    );
  }
};

// Employee Performance Report Exports
export const exportEmployeeReport = (data: any[], format: 'excel' | 'pdf') => {
  const formattedData = data.map(emp => ({
    Name: emp.name,
    Email: emp.email,
    Role: emp.role,
    'Jobs Assigned': emp.jobsAssigned || 0,
    'Active Projects': emp.activeProjects || 0,
    'Completed Projects': emp.completedProjects || 0,
    'Tasks Completed': emp.tasksCompleted || 0,
    'Total Tasks': emp.tasksTotal || 0,
    'Completion Rate': `${emp.taskCompletionRate || 0}%`,
    'Overdue Tasks': emp.overdueTasks || 0,
    'Days Late': emp.daysLate || 0,
    'Days Called Off': emp.daysCalledOff || 0
  }));
  
  if (format === 'excel') {
    exportToExcel(formattedData, 'employee-performance-report', 'Employee Performance');
  } else {
    exportTableToPDF(
      formattedData,
      ['Name', 'Role', 'Jobs Assigned', 'Active Projects', 'Completed Projects', 
       'Tasks Completed', 'Total Tasks', 'Completion Rate', 'Overdue Tasks'],
      'employee-performance-report',
      'Employee Performance Report'
    );
  }
};

// Profit/Loss Report Exports
export const exportProfitLossReport = (data: any[], format: 'excel' | 'pdf', view: string) => {
  const formattedData = data.map(item => ({
    Period: item.date || item.week || item.month || item.projectName || 'N/A',
    Revenue: `$${item.revenue?.toFixed(2) || '0.00'}`,
    Expenses: `$${(item.expenses || item.totalCosts || 0).toFixed(2)}`,
    Profit: `$${(item.profit || item.netProfit || 0).toFixed(2)}`,
    'Profit Margin': `${(item.profitMargin || 0).toFixed(1)}%`
  }));
  
  if (format === 'excel') {
    exportToExcel(formattedData, `profit-loss-report-${view}`, 'Profit & Loss');
  } else {
    exportTableToPDF(
      formattedData,
      ['Period', 'Revenue', 'Expenses', 'Profit', 'Profit Margin'],
      `profit-loss-report-${view}`,
      `Profit & Loss Report (${view.charAt(0).toUpperCase() + view.slice(1)})`
    );
  }
};

// Profit Per Vehicle Report Exports
export const exportProfitPerVehicleReport = (data: any[], format: 'excel' | 'pdf') => {
  const formattedData = data.map(item => ({
    Vehicle: item.vehicleName || 'N/A',
    'License Plate': item.licensePlate || 'N/A',
    Revenue: `$${item.revenue?.toFixed(2) || '0.00'}`,
    'Material Costs': `$${item.materialsCost?.toFixed(2) || '0.00'}`,
    'Travel Fuel': `$${item.travelFuelCost?.toFixed(2) || '0.00'}`,
    'Travel Labor': `$${item.travelLaborCost?.toFixed(2) || '0.00'}`,
    'On-Site Labor': `$${item.onsiteLaborCosts?.toFixed(2) || '0.00'}`,
    'Total Expenses': `$${item.totalExpenses?.toFixed(2) || '0.00'}`,
    'Net Profit': `$${item.netProfit?.toFixed(2) || '0.00'}`,
    'Profit Margin': `${item.profitMargin?.toFixed(1) || '0.0'}%`
  }));
  
  if (format === 'excel') {
    exportToExcel(formattedData, 'profit-per-vehicle-report', 'Profit Per Vehicle');
  } else {
    exportTableToPDF(
      formattedData,
      ['Vehicle', 'Revenue', 'Material Costs', 'Travel Fuel', 'Travel Labor', 
       'On-Site Labor', 'Total Expenses', 'Net Profit', 'Profit Margin'],
      'profit-per-vehicle-report',
      'Profit Per Vehicle Report'
    );
  }
};

// Job Analytics Report Exports
export const exportJobAnalyticsReport = (data: any, format: 'excel' | 'pdf') => {
  const summaryData = [{
    'Total Jobs': data?.totalJobs || 0,
    'Completed Jobs': data?.completedJobs || 0,
    'Completion Rate': `${data?.completionRate?.toFixed(1) || '0.0'}%`,
    'Average Duration (hours)': data?.avgJobDuration?.toFixed(1) || '0.0',
    'Total Arrivals': data?.gpsTrackingMetrics?.totalArrivals || 0,
    'Total Departures': data?.gpsTrackingMetrics?.totalDepartures || 0,
    'Total Onsite Hours': data?.gpsTrackingMetrics?.totalOnsiteHours?.toFixed(1) || '0.0',
    'Active Job Sites': data?.gpsTrackingMetrics?.activeJobSites || 0
  }];
  
  if (format === 'excel') {
    exportToExcel(summaryData, 'job-analytics-report', 'Job Analytics');
  } else {
    exportTableToPDF(
      summaryData,
      ['Total Jobs', 'Completed Jobs', 'Completion Rate', 'Average Duration (hours)', 
       'Total Arrivals', 'Total Departures', 'Active Job Sites'],
      'job-analytics-report',
      'Job Analytics Report'
    );
  }
};
