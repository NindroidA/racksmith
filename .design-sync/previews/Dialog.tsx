import { Dialog, Button } from "racksmith";
import { DarkBackdrop } from "./_capture";

export const Default = () => (
  <>
    <DarkBackdrop />
    <Dialog
      open
      onClose={() => {}}
      labelledBy="dlg-title"
      describedBy="dlg-desc"
      size="md"
    >
      <header className="border-b border-white/[0.08] px-5 py-4">
        <h2 id="dlg-title" className="font-semibold text-white">
          Rename rack
        </h2>
      </header>
      <div id="dlg-desc" className="space-y-3 px-5 py-4">
        <p className="text-sm text-white/60">Give this rack a clear, unique name.</p>
        <input
          className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
          defaultValue="Rack A1 — Core"
          aria-label="Rack name"
        />
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-5 py-3">
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Save changes</Button>
      </footer>
    </Dialog>
  </>
);
