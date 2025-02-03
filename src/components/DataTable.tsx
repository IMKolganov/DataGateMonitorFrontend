import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from "@tanstack/react-table";
import { useMemo } from "react";

interface Data {
  id: number;
  name: string;
  status: string;
}

interface DataTableProps {
  data: Data[];
}

export function DataTable({ data }: DataTableProps) {
  const columns = useMemo<ColumnDef<Data>[]>(
    () => [
      { accessorKey: "id", header: "ID" },
      { accessorKey: "name", header: "Server Name" },
      { accessorKey: "status", header: "Status" },
    ],
    []
  );

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <table className="min-w-full border-collapse border border-gray-300">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="bg-gray-100">
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="border p-2">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="border p-2">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
