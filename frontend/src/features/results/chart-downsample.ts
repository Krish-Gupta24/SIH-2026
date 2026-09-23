/**
 * Intelligent Chart Downsampler
 * Prevents Recharts SVG performance collapse and illegible axis collisions
 * when rendering large simulations (720h monthly or 8,760h annual datasets).
 */

export interface DownsampledSeries {
  indices: number[];
  stride: number;
  isDownsampled: boolean;
  totalPoints: number;
}

export function computeDownsampleIndices(
  totalLength: number,
  maxPoints: number = 168
): DownsampledSeries {
  if (totalLength <= maxPoints || totalLength <= 0) {
    return {
      indices: Array.from({ length: totalLength }, (_, i) => i),
      stride: 1,
      isDownsampled: false,
      totalPoints: totalLength,
    };
  }

  const stride = Math.ceil(totalLength / maxPoints);
  const indices: number[] = [];
  for (let i = 0; i < totalLength; i += stride) {
    indices.push(i);
  }

  // Ensure last point is always included for complete cycle boundary
  if (indices[indices.length - 1] !== totalLength - 1) {
    indices.push(totalLength - 1);
  }

  return {
    indices,
    stride,
    isDownsampled: true,
    totalPoints: totalLength,
  };
}

export function formatTimeLabel(ts: string, index: number, stride: number = 1): string {
  if (!ts) return `H${index + 1}`;

  // If ISO timestamp like "2024-01-15T14:00:00"
  if (ts.includes("T")) {
    const parts = ts.split("T");
    const datePart = parts[0];
    const timePart = parts[1]?.slice(0, 5) || "";

    if (stride >= 24) {
      // Annual or multi-week view: show month/day
      const mMatch = datePart.match(/-(\d{2})-(\d{2})$/);
      if (mMatch) {
        return `${mMatch[1]}/${mMatch[2]}`;
      }
      return datePart;
    }
    return timePart || ts;
  }

  if (stride > 24) {
    const day = Math.floor(index / 24) + 1;
    return `Day ${day}`;
  }

  return ts.length > 8 ? ts.slice(-8) : ts;
}
