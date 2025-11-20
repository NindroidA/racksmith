/**
 * Comprehensive skeleton loading components
 * Reusable skeleton loaders for consistent loading states across the app
 */

import React from 'react';
import { Skeleton } from './skeleton';

/**
 * Skeleton for stat cards (Dashboard stats)
 */
export function StatCardSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

/**
 * Skeleton for rack cards (Dashboard, Racks page)
 */
export function RackCardSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}

/**
 * Skeleton for device cards (Device Library)
 */
export function DeviceCardSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/**
 * Skeleton for network plan cards (Saved Plans)
 */
export function NetworkPlanCardSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-56 mb-2" />
          <Skeleton className="h-4 w-32 mb-3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/10">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for full table
 */
export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-white/10">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton for form inputs
 */
export function FormInputSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * Skeleton for full form
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="glass-card p-6 space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <FormInputSkeleton key={i} />
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for page header
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-5 w-96" />
    </div>
  );
}

/**
 * Skeleton for grid of cards
 */
export function CardGridSkeleton({ 
  count = 6, 
  CardComponent = RackCardSkeleton 
}: { 
  count?: number; 
  CardComponent?: React.ComponentType;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardComponent key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for list items
 */
export function ListItemSkeleton() {
  return (
    <div className="glass-card p-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="flex-1">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for search/filter bar
 */
export function SearchBarSkeleton() {
  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton for rack visualizer
 */
export function RackVisualizerSkeleton() {
  return (
    <div className="glass-card p-6">
      <Skeleton className="h-8 w-48 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Full page skeleton with header and cards
 */
export function PageSkeleton({ 
  cardCount = 6,
  CardComponent = RackCardSkeleton,
  showSearch = false 
}: { 
  cardCount?: number;
  CardComponent?: React.ComponentType;
  showSearch?: boolean;
}) {
  return (
    <div className="p-8">
      <PageHeaderSkeleton />
      {showSearch && <SearchBarSkeleton />}
      <CardGridSkeleton count={cardCount} CardComponent={CardComponent} />
    </div>
  );
}
