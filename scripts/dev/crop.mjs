import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [inFile, outFile, y, h] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(inFile));
const out = new PNG({ width: png.width, height: Number(h) });
for (let i = 0; i < Number(h); i++) {
  const s = (Number(y) + i) * png.width * 4;
  png.data.copy(out.data, i * png.width * 4, s, s + png.width * 4);
}
writeFileSync(outFile, PNG.sync.write(out));
console.log(`wrote ${outFile}`);
