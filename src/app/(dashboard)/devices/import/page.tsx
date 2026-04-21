import { requireMember } from "@/lib/auth-helpers";
import { DeviceImportClient } from "@/components/device/device-import-client";

export default async function DeviceImportPage() {
  await requireMember("member");
  return <DeviceImportClient />;
}
