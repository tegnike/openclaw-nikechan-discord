# PNG Tuber Builder
FROM rust:1.75-slim-bookworm as builder

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    pkg-config \
    libasound2-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Cargo.toml ./
COPY src ./src

# リリースビルド
RUN cargo build --release

# 実行用の軽量イメージ
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libasound2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/pngtuber ./

ENTRYPOINT ["./pngtuber"]
