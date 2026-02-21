# Snakie

Originally a Snake game written in pure C++.  
This branch adds a **web Mahjong prototype with neural-network AI**.

## Mahjong NN Web

- Entry: `web/mahjong-nn/index.html`
- Direct open in browser, or serve locally:

```bash
cd /Users/sunbelife/Code/LLMGRoup/Snakie
python3 -m http.server 8080
# open http://localhost:8080/web/mahjong-nn/
```

### Features

- Simplified mahjong tiles: 万/筒/条 (1-9, four copies each)
- Win condition: 4 melds + 1 pair (self-draw only)
- 1 human + 3 AI players
- AI discard by lightweight feedforward neural network
- In-browser training button for the AI
- Round status, hand rendering and game logs

## Tests

```bash
cd /Users/sunbelife/Code/LLMGRoup/Snakie
PATH=/opt/homebrew/opt/node/bin:$PATH node ./web/mahjong-nn/tests/engine.test.js
```

## Original C++ Version

The original C++ Snake files remain in the repository root and can still be built by CMake.
