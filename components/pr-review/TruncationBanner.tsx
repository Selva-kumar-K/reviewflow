import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TruncationBanner({
  includedCount,
  totalCount,
}: {
  includedCount: number;
  totalCount: number;
}) {
  return (
    <Alert className="mb-4">
      <TriangleAlert />
      <AlertDescription>
        AI review covers the first {includedCount} of {totalCount} changed files — PR too large
        to review in full.
      </AlertDescription>
    </Alert>
  );
}
