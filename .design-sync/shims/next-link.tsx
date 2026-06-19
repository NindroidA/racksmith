// design-sync shim for `next/link` — RackSmith is a Next.js app, but the design
// bundle renders components standalone (no Next router context). next/link's real
// <Link> calls useRouter and renders blank outside an app-router tree, so for
// preview/bundle purposes we map it to a plain anchor that passes href + props
// through. Wired via cfg.tsconfig -> .design-sync/tsconfig.build.json `paths`.
import * as React from "react";

type LinkShimProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string | { pathname?: string };
};

export default function Link({ href, children, ...rest }: LinkShimProps) {
  const hrefStr = typeof href === "string" ? href : (href?.pathname ?? "#");
  return (
    <a href={hrefStr} {...rest}>
      {children}
    </a>
  );
}
