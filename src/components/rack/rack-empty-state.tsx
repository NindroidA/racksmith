"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Server } from "lucide-react";
import { EmptyStateWithTemplate } from "@/components/ui/empty-state-with-template";
import { TemplateGallery } from "@/components/ui/template-gallery";
import {
  RACK_TEMPLATES,
  type RackTemplate,
} from "@/lib/templates/racks";
import { createRackFromTemplate } from "@/app/(dashboard)/racks/actions";
import { describeError } from "@/lib/error-message";

export function RackEmptyState() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pickTemplate = (t: RackTemplate) => {
    if (pending) return;
    setSubmittingId(t.id);
    startTransition(async () => {
      try {
        const result = await createRackFromTemplate(t.id);
        if (!result.ok) {
          toast.error(result.error);
          setSubmittingId(null);
          return;
        }
        toast.success(`${t.name} created`);
        router.push(`/racks/${result.data.id}`);
      } catch (err) {
        toast.error(describeError(err, "Something went wrong"));
        setSubmittingId(null);
      }
    });
  };

  return (
    <>
      <EmptyStateWithTemplate
        icon={<Server className="h-8 w-8" />}
        iconClassName="bg-accent-blue/20 text-accent-blue"
        title="No racks yet"
        blurb="Your first rack takes under a minute. Pick a template that matches your setup, or start blank."
        onStartFromTemplate={() => setOpen(true)}
        blankHref="/racks/new"
      />
      <TemplateGallery
        open={open}
        onOpenChange={setOpen}
        title="Rack templates"
        subtitle="Pick a preset that's closest — you can tweak anything after."
        items={RACK_TEMPLATES}
        onSelect={pickTemplate}
        submittingId={submittingId}
        renderPreview={(t) => (
          <div className="flex h-24 items-center justify-center gap-0.5 p-3">
            {Array.from({ length: Math.min(t.sizeU, 20) }).map((_, i) => (
              <div
                key={i}
                className="h-full w-1 rounded-sm bg-white/[0.08]"
                aria-hidden
              />
            ))}
            <span className="ml-3 font-mono text-xs text-white/40">
              {t.sizeU}U
            </span>
          </div>
        )}
      />
    </>
  );
}
