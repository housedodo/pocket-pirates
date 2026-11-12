# HOIST as a standalone app (Electron)

Plays the single-file demo in its own window, no browser needed. Saves stay on that computer.

    # in the repo root: build the single-file games
    npx vite build && python3 scripts/single.py
    # then here
    cd electron && npm install
    npm run pack:win      # Windows x64  -> out/HOIST-win32-x64/HOIST.exe
    npm run pack:mac      # macOS (universal, unsigned: right-click > Open the first time)
    npm run pack:linux    # Linux x64

`node pack.js win32 dev` packs the dev build instead of the demo. Zip the folder in `out/` to send it.
