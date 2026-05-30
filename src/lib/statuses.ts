export function getClosingStatus<T extends { isClosing?: boolean | null }>(
  statuses: T[]
): T | undefined {
  return statuses.find((s) => s.isClosing);
}

export function getClosingStatusOrLastByOrder<
  T extends { isClosing?: boolean | null; order: number },
>(statuses: T[]): T | undefined {
  const closing = getClosingStatus(statuses);
  if (closing) return closing;
  if (statuses.length === 0) return undefined;
  return [...statuses].sort((a, b) => b.order - a.order)[0];
}

export function getClosingStatusId(
  statuses: { id: string; isClosing?: boolean | null }[]
): string | undefined {
  return getClosingStatus(statuses)?.id;
}

export function isTaskOverdue(
  task: {
    deadline: Date | null;
    statusId?: string | null;
    status?: { isClosing?: boolean | null } | null;
  },
  options?: { closingStatusId?: string | null; now?: Date }
): boolean {
  const now = options?.now ?? new Date();
  if (!task.deadline || task.deadline >= now) return false;
  if (task.status?.isClosing) return false;
  if (options?.closingStatusId && task.statusId === options.closingStatusId) {
    return false;
  }
  return true;
}
