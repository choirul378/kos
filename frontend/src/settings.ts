import { storage } from "./utils/storage";

const KOS_NAME = "kos_name";
const OWNER_NAME = "kos_owner";

export async function getProfile() {
  const kosName = (await storage.getItem(KOS_NAME, "Kos Saya")) || "Kos Saya";
  const ownerName = (await storage.getItem(OWNER_NAME, "")) || "";
  return { kosName, ownerName };
}

export async function saveProfile(kosName: string, ownerName: string) {
  await storage.setItem(KOS_NAME, kosName.trim() || "Kos Saya");
  await storage.setItem(OWNER_NAME, ownerName.trim());
}
