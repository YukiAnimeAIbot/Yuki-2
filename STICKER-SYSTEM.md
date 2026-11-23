# Yuki AI Sticker Delivery — v6.0.0

- Every non-empty Yuki AI response is followed by exactly one separate existing WebP sticker message.
- Sticker delivery is not chance-gated or cooldown-gated. A sticker-send failure does not cancel the already-sent text response.
- The 532-file main collection was deduplicated to 360 unique sticker files. Every remaining sticker is included in the shuffle-bag rotation and has a mood manifest entry (calm, laugh, shy, hype, thinking, warm, mischievous, curious or greeting).
- Mood tags bias selection when available; they never remove stickers from the full rotation.
- The separate Owner-mention reaction collection was deduplicated to one unique sticker. Its file filter was corrected so the reaction handler can find `.webp` files.
- Sticker generation and media conversion commands (`/s`, `/sticker`, `/take`, `/toimg`, `/tourl`, `/compress`, `/resize`, `/crop`, `/blur`, `/caption`, `/quote`) remain removed.
