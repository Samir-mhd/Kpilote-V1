const sharp = require("sharp");
const path = require("path");

const svg = path.join(__dirname, "../public/icon.svg");
const out = path.join(__dirname, "../public");

const icons = [
    { file: "icon-192.png",        size: 192 },
    { file: "icon-512.png",        size: 512 },
    { file: "apple-touch-icon.png", size: 180 },
];

(async () => {
    for (const { file, size } of icons) {
        await sharp(svg)
            .resize(size, size)
            .png()
            .toFile(path.join(out, file));
        console.log(`✓ ${file} (${size}×${size})`);
    }
    console.log("Done — PWA icons generated.");
})();
