// design-sync bundle entry. RackSmith is a Next.js app with no library `dist/`,
// so instead of letting the converter synth an entry that re-exports ALL of src/
// (which would drag server actions / Prisma / next/headers into the browser
// bundle), this entry re-exports ONLY the design-system primitives we sync.
// Wired via cfg.entry. Props/.d.ts still come from each component's real source
// (cfg.componentSrcMap), not from here. Relative imports keep the entry itself
// alias-free; the components' own `@/…` imports resolve via tsconfig.build.json.
export { Button } from "../src/components/ui/button";
export { Tag } from "../src/components/ui/tag";
export { Dialog } from "../src/components/ui/dialog";
export { Select, SelectOption } from "../src/components/ui/select";
export { Tooltip } from "../src/components/ui/tooltip";
export { DeleteConfirmDialog } from "../src/components/ui/delete-confirm-dialog";
export { ColorTagPicker } from "../src/components/ui/color-tag-picker";
export { AdvancedAccordion } from "../src/components/ui/advanced-accordion";
export { InlineHelp } from "../src/components/ui/inline-help";
export { EmptyStateWithTemplate } from "../src/components/ui/empty-state-with-template";
export { TemplateGallery } from "../src/components/ui/template-gallery";
export { GithubIcon, GoogleIcon } from "../src/components/ui/oauth-icons";
