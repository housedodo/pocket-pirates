"""Contact sheets for the visual QA captures (test tooling only).
python3 tools/visualqa/sheet.py <outFile.png> <cols> <img1> <img2> ... [--labels]
Each tile is labelled with its file name (no extension); tiles are scaled to 640 wide."""
import sys, os
from PIL import Image, ImageDraw

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out, cols, files = args[0], int(args[1]), args[2:]
    tiles = []
    for f in files:
        im = Image.open(f).convert('RGB')
        w = 640; h = round(im.height * w / im.width)
        tiles.append((os.path.splitext(os.path.basename(f))[0], im.resize((w, h))))
    if not tiles: return
    w, h = tiles[0][1].size
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (w * cols, h * rows), (8, 8, 12))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(tiles):
        x, y = (i % cols) * w, (i // cols) * h
        sheet.paste(im, (x, y))
        d.rectangle([x, y, x + 8 * len(name) + 10, y + 16], fill=(0, 0, 0))
        d.text((x + 5, y + 3), name, fill=(255, 230, 120))
    sheet.save(out)
    print('wrote', out, sheet.size)

if __name__ == '__main__':
    main()
