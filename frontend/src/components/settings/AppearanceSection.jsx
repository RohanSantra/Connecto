import { Button } from "@/components/ui/button";

export default function AppearanceSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Appearance</h2>

      <div className="space-y-4">
        <p className="text-muted-foreground">
          Change theme, colors, and display preferences.
        </p>

        <div className="flex gap-3">
          <Button onClick={() => document.documentElement.classList.remove("dark")}>
            Light Mode
          </Button>
          <Button onClick={() => document.documentElement.classList.add("dark")}>
            Dark Mode
          </Button>
        </div>
      </div>
    </div>
  );
}
