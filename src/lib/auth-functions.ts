import { createServerFn } from "@tanstack/react-start";
import {
  getSessionFromRequest,
  requireSessionFromRequest,
} from "~/lib/session";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionFromRequest();
});

export const requireSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return requireSessionFromRequest();
  }
);
