import * as XLSX from 'xlsx';

export const exportEmployeeHoursToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Hours");
  
  // Generate buffer and download
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};