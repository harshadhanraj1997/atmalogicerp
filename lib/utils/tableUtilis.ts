
export const exportToExcel = (tableRef: React.RefObject<HTMLTableElement>) => {
    const table = tableRef.current;
    if (!table) {
      console.error("Table reference is not available.");
      return;
    }
    const rows = Array.from(table.rows);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows
        .map((row) => {
          const cells = Array.from(row.cells);
          return cells.map((cell) => cell.innerText).join(",");
        })
        .join("\n");
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "table_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  export const exportToPDF = (tableRef: React.RefObject<HTMLTableElement>) => {
    const table = tableRef.current;
    if (!table) {
      console.error("Table reference is not available.");
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>Table Export</title>
        </head>
        <body>${table.outerHTML}</body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "table_data.pdf";
    link.click();
  };
  
  export const printTable = (tableRef: React.RefObject<HTMLTableElement>) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("Unable to open print window.");
      return;
    }
    const table = tableRef.current;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Table</title>
        </head>
        <body>${table?.outerHTML || ""}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };
  