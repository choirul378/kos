import { requireOptionalNativeModule } from "expo";

export type PairedDevice = { name: string; address: string };

type BtPrinterModule = {
  getPairedDevices(): Promise<PairedDevice[]>;
  print(address: string, base64: string): Promise<void>;
};

export const BtPrinter = requireOptionalNativeModule<BtPrinterModule>("BtPrinter");
