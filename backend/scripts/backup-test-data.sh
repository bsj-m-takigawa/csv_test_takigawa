#!/bin/bash

# テストデータバックアップスクリプト
# 使用方法: ./scripts/backup-test-data.sh [backup_name]

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# バックアップ名（引数がない場合はタイムスタンプを使用）
BACKUP_NAME=${1:-"test_backup_$(date +%Y%m%d_%H%M%S)"}
BACKUP_DIR="$BACKEND_DIR/storage/test-backups"
BACKUP_FILE="$BACKUP_DIR/${BACKUP_NAME}.sql"

# .envファイルから環境変数を読み込み
if [ -f "$BACKEND_DIR/.env" ]; then
    export $(grep -E "^DB_" "$BACKEND_DIR/.env" | xargs)
fi

# バックアップディレクトリを作成
mkdir -p "$BACKUP_DIR"

echo "テストデータをバックアップ中..."
echo "バックアップファイル: $BACKUP_FILE"

# MySQLダンプを実行（Dockerコンテナ内から）
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    # Dockerコンテナが存在する場合
    if docker ps --format "table {{.Names}}" | grep -q mysql; then
        docker exec $(docker ps --format "table {{.Names}}" | grep mysql | head -n1) \
            mysqldump -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-password}" "${DB_DATABASE:-laravel}" > "$BACKUP_FILE"
    else
        echo "MySQL Dockerコンテナが見つかりません。"
        echo "直接MySQLに接続してバックアップを作成します。"
        mysqldump -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-password}" "${DB_DATABASE:-laravel}" > "$BACKUP_FILE"
    fi
else
    # Dockerを使用しない場合
    mysqldump -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-password}" "${DB_DATABASE:-laravel}" > "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ バックアップが正常に作成されました: $BACKUP_FILE"
    echo "📊 バックアップファイルサイズ: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
    
    # 古いバックアップファイルを削除（7日以上古いもの）
    find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
    echo "🗑️  7日以上古いバックアップファイルを削除しました。"
else
    echo "❌ バックアップの作成に失敗しました。"
    exit 1
fi