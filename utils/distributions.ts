import { DistributionWithDetails } from '../types/duty';

const getTimestamp = (value?: string | null): number => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const compareDistributionsByActuality = (
  left: DistributionWithDetails,
  right: DistributionWithDetails,
): number => {
  const effectiveDateDiff =
    getTimestamp(right.workHistory.effectiveDate) - getTimestamp(left.workHistory.effectiveDate);

  if (effectiveDateDiff !== 0) {
    return effectiveDateDiff;
  }

  const createdAtDiff = getTimestamp(right.createdAt) - getTimestamp(left.createdAt);
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return getTimestamp(right.workHistory.date) - getTimestamp(left.workHistory.date);
};

export const sortDistributionsByActuality = (
  distributions: DistributionWithDetails[] | null | undefined,
): DistributionWithDetails[] => {
  if (!distributions || distributions.length === 0) {
    return [];
  }

  return [...distributions].sort(compareDistributionsByActuality);
};

export const getLatestDistribution = (
  distributions: DistributionWithDetails[] | null | undefined,
): DistributionWithDetails | null => {
  const sortedDistributions = sortDistributionsByActuality(distributions);
  return sortedDistributions[0] ?? null;
};
