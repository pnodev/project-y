import { Store, useStore } from "@tanstack/react-store";

export type SortByType = "due" | "created" | "updated";
type BoardViewState = {
  quickCreateOpenFor: null | string;
  sortBy: SortByType;
  sortDirection: "asc" | "desc";
};

export const BoardViewStore = new Store<BoardViewState>({
  quickCreateOpenFor: null,
  sortBy: "due",
  sortDirection: "desc",
});
