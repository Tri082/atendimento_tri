"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  SearchIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./empty-state";

type Props<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Coluna usada pra busca global. */
  searchColumn?: string;
  searchPlaceholder?: string;
  /** Slot pra ações à direita do search (ex: botão Novo). */
  toolbar?: ReactNode;
  /** Empty state customizado quando data está vazio. */
  empty?: ReactNode;
  /** Linhas por página. Default 10. */
  pageSize?: number;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = "Buscar...",
  toolbar,
  empty,
  pageSize = 10,
}: Props<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    state: { sorting, columnFilters },
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const hasData = data.length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(searchColumn || toolbar) && (
        <div className="flex items-center gap-2">
          {searchColumn && (
            <div className="relative max-w-sm flex-1">
              <SearchIcon className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
                onChange={(e) => table.getColumn(searchColumn)?.setFilterValue(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
          )}
          {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-card/40">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="border-border/60 hover:bg-transparent">
                {group.headers.map((header) => (
                  <TableHead key={header.id} className="label-mono h-10 px-4 text-foreground/70">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!hasData ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-64 p-0">
                  {empty ?? (
                    <EmptyState
                      title="Nada por aqui ainda"
                      description="Quando você criar algo, vai aparecer nessa tabela."
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <p className="text-muted-foreground text-sm">Nenhum resultado pra essa busca.</p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-border/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {hasData && totalRows > pageSize && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] text-muted-foreground">
            página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} ·{" "}
            {totalRows} {totalRows === 1 ? "registro" : "registros"}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="Primeira página"
            >
              <ChevronsLeftIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Anterior"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Próxima"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Última página"
            >
              <ChevronsRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
