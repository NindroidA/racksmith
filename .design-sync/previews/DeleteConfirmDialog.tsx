import { DeleteConfirmDialog } from "racksmith";
import { DarkBackdrop } from "./_capture";

export const Default = () => (
  <>
    <DarkBackdrop />
    <DeleteConfirmDialog
      open
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete rack?"
      confirmLabel="Delete rack"
      body={
        <p>
          This permanently removes{" "}
          <span className="mono text-white">Rack A1 — Core</span> and un-racks its
          12 devices. This can&rsquo;t be undone.
        </p>
      }
    />
  </>
);

export const TypeToConfirm = () => (
  <>
    <DarkBackdrop />
    <DeleteConfirmDialog
      open
      onClose={() => {}}
      onConfirm={() => {}}
      title="Delete organization?"
      confirmLabel="Delete organization"
      requireTypeName="acme-labs"
      body={<p>All racks, devices, members, and API keys will be permanently removed.</p>}
    />
  </>
);
