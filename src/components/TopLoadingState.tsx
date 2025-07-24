export function TopLoadingState({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return (
    <div id="foo" className="w-full fixed top-0 left-0 z-60">
      <div className="h-1 w-full overflow-hidden bg-blue-100/20">
        <div className="h-full w-full origin-left-right animate-progress bg-blue-500"></div>
      </div>
    </div>
  );
}
