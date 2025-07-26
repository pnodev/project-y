import { Store, useStore } from "@tanstack/react-store";

type BoardViewState = {
  quickCreateOpenFor: null | string;
};

export const BoardViewStore = new Store<BoardViewState>({
  quickCreateOpenFor: null,
});
