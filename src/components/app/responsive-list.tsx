'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type ResponsiveListProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  renderCard: (item: TData, index: number) => React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
  getRowId?: (row: TData, index: number) => string;
};

export function ResponsiveList<TData>({
  data,
  columns,
  renderCard,
  empty,
  className,
  getRowId,
}: ResponsiveListProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId
      ? (row, index) => getRowId(row, index)
      : undefined,
  });

  if (data.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className={cn(className)}>
      <div className="space-y-3 md:hidden">
        {data.map((item, index) => (
          <React.Fragment key={getRowId?.(item, index) ?? index}>
            {renderCard(item, index)}
          </React.Fragment>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[12px] border border-border bg-card md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
