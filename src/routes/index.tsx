import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ComboBox } from "~/components/ComboBox";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <ComboBox
        value={selected}
        onChange={setSelected}
        items={[
          {
            value: "next.js",
            label: "Next.js",
          },
          {
            value: "sveltekit",
            label: "SvelteKit",
          },
          {
            value: "nuxt.js",
            label: "Nuxt.js",
          },
          {
            value: "remix",
            label: "Remix",
          },
          {
            value: "astro",
            label: "Astro",
          },
        ]}
      />
    </div>
  );
}
