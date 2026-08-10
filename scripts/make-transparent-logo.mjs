import sharp from "sharp";
import { copyFileSync } from "node:fs";

// The RTU seal the user just provided.
const SRC = "C:/Users/patricia cardel/.cursor/projects/c-Users-patricia-cardel-knowledge-kin-net/assets/c__Users_patricia_cardel_AppData_Roaming_Cursor_User_workspaceStorage_eeb372729caab188aa102f33887bac0e_images_RTU_Logo-removebg-preview-52cb51c0-a1ea-4b9b-95c0-46146b6321f5.png";
const WORK_SRC = "c:/Users/patricia cardel/knowledge-kin-net/public/rtu-source.png";
const OUT_FULL = "c:/Users/patricia cardel/knowledge-kin-net/public/logo.png";
const OUT_HD = "c:/Users/patricia cardel/knowledge-kin-net/public/logo@2x.png";

// Stage the user-provided seal into /public so sharp can read it.
copyFileSync(SRC, WORK_SRC);

const img = sharp(WORK_SRC);
const meta = await img.metadata();
console.log("source:", meta.width, "x", meta.height, meta.hasAlpha ? "with-alpha" : "no-alpha");

const { data, info } = await img
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Even though the file name says "removebg-preview", be defensive: strip
// any remaining near-white pixels so the seal truly has no background.
const threshold = 240;
const falloff = 12;
for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (r >= threshold && g >= threshold && b >= threshold) {
    const min = Math.min(r, g, b);
    data[i + 3] = min >= threshold ? 0 : Math.max(0, Math.round(((min - (threshold - falloff)) / falloff) * 255));
  }
}

// Square transparent assets. The seal is itself square so no padding needed.
const targetFull = 1024;
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(targetFull, targetFull, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(OUT_FULL);
console.log("wrote", OUT_FULL, targetFull, "x", targetFull);

const targetHd = 512;
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(targetHd, targetHd, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(OUT_HD);
console.log("wrote", OUT_HD, targetHd, "x", targetHd);