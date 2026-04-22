"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HardDrive } from "lucide-react";
import { EmptyStateWithTemplate } from "@/components/ui/empty-state-with-template";
import { TemplateGallery } from "@/components/ui/template-gallery";
import {
  DEVICE_TEMPLATES,
  type DeviceTemplate,
} from "@/lib/templates/devices";
import { createDeviceFromTemplate } from "@/app/(dashboard)/devices/actions";
import { describeError } from "@/lib/error-message";

export function DeviceEmptyState() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pickTemplate = (t: DeviceTemplate) => {
    if (pending) return;
    setSubmittingId(t.id);
    startTransition(async () => {
      try {
        const result = await createDeviceFromTemplate(t.id);
        if (!result.ok) {
          toast.error(result.error);
          setSubmittingId(null);
          return;
        }
        toast.success(`${t.name} created`);
        router.push(`/devices/${result.data.id}`);
      } catch (err) {
        toast.error(describeError(err, "Something went wrong"));
        setSubmittingId(null);
      }
    });
  };

  return (
    <>
      <EmptyStateWithTemplate
        icon={<HardDrive className="h-8 w-8" />}
        iconClassName="bg-accent-purple/20 text-accent-purple"
        title="No devices yet"
        blurb="Pick a device template to get going fast, import a CSV, or add one from scratch."
        onStartFromTemplate={() => setOpen(true)}
        blankHref="/devices/new"
        secondaryHref="/devices/import"
        secondaryLabel="Import CSV"
      />
      <TemplateGallery
        open={open}
        onOpenChange={setOpen}
        title="Device templates"
        subtitle="Common starting points. Customize make, model, and placement after."
        items={DEVICE_TEMPLATES}
        onSelect={pickTemplate}
        submittingId={submittingId}
      />
    </>
  );
}
