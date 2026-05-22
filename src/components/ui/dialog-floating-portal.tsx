import * as React from "react";

type DialogFloatingPortalContextValue = {
  host: HTMLDivElement | null;
};

const DialogFloatingPortalContext =
  React.createContext<DialogFloatingPortalContextValue | null>(null);

export function useDialogFloatingPortal() {
  return React.useContext(DialogFloatingPortalContext)?.host ?? null;
}

/** True when rendered inside `DialogContent` (floating menus should use dialog portal). */
export function useIsInDialog() {
  return React.useContext(DialogFloatingPortalContext) !== null;
}

/**
 * Host for popovers/selects inside a dialog. Renders above dialog children (z-200)
 * so menus are not covered by the editor or other sections below the trigger.
 */
export function DialogFloatingPortalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [portalHost, setPortalHost] = React.useState<HTMLDivElement | null>(
    null
  );

  return (
    <DialogFloatingPortalContext.Provider value={{ host: portalHost }}>
      {children}
      {/* Zero-size host: menus use fixed positioning; must not blanket-block clicks */}
      <div
        ref={setPortalHost}
        data-slot="dialog-floating-portal"
        className="absolute top-0 left-0 z-[200] h-0 w-0 overflow-visible"
      />
    </DialogFloatingPortalContext.Provider>
  );
}
