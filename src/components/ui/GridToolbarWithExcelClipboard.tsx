import { useCallback } from "react";
import {
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarExport,
  useGridApiContext,
  type GridToolbarProps,
} from "@mui/x-data-grid";
import * as XLSX from "xlsx";

function GridToolbarWithExcelClipboard(props: GridToolbarProps) {
  const apiRef = useGridApiContext();

  const handleExportExcel = useCallback(() => {
    if (!apiRef.current) return;
    const csv = apiRef.current.getDataAsCsv({
      delimiter: ",",
      includeHeaders: true,
    });
    if (!csv) return;
    const wb = XLSX.read(csv, { type: "string", FS: "," });
    const fileName = `export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [apiRef]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!apiRef.current) return;
    const csv = apiRef.current.getDataAsCsv({
      delimiter: "\t",
      includeHeaders: true,
    });
    if (!csv) return;
    try {
      await navigator.clipboard.writeText(csv);
    } catch {
      // fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = csv;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }, [apiRef]);

  return (
    <GridToolbarContainer {...props}>
      <GridToolbarColumnsButton />
      <GridToolbarExport csvOptions={props.csvOptions} printOptions={props.printOptions} />
      <button
        type="button"
        className="btn secondary"
        onClick={handleExportExcel}
        style={{ marginLeft: 8 }}
        title="Export to Excel"
      >
        Excel
      </button>
      <button
        type="button"
        className="btn secondary"
        onClick={handleCopyToClipboard}
        style={{ marginLeft: 4 }}
        title="Copy to clipboard (tab-separated)"
      >
        Clipboard
      </button>
    </GridToolbarContainer>
  );
}

export default GridToolbarWithExcelClipboard;
