#!/bin/bash

# テストデータ復元スクリプト
# 使用方法: ./scripts/restore-test-data.sh [backup_file]

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$BACKEND_DIR/storage/test-backups"

# .envファイルから環境変数を読み込み
if [ -f "$BACKEND_DIR/.env" ]; then
    export $(grep -E "^DB_" "$BACKEND_DIR/.env" | xargs)
fi

# バックアップファイルの指定
if [ -z "$1" ]; then
    echo "利用可能なバックアップファイル:"
    ls -la "$BACKUP_DIR"/*.sql 2>/dev/null | awk '{print $9}' | sed 's|.*/||'
    echo ""
    echo "使用方法: $0 <backup_file_name>"
    echo "例: $0 test_backup_20250806_120000.sql"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

# バックアップファイルの存在確認
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ バックアップファイルが見つかりません: $BACKUP_FILE"
    exit 1
fi

echo "テストデータを復元中..."
echo "復元ファイル: $BACKUP_FILE"

# 確認プロンプト
echo ""
read -p "⚠️  現在のデータベースを上書きして復元します。続行しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "復元をキャンセルしました。"
    exit 1
fi

# MySQLに復元を実行
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    # Dockerコンテナが存在する場合
    if docker ps --format "table {{.Names}}" | grep -q mysql; then
        docker exec -i $(docker ps --format "table {{.Names}}" | grep mysql | head -n1) \
            mysql -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-password}" "${DB_DATABASE:-laravel}" < "$BACKUP_FILE"
    else
        echo "MySQL Dockerコンテナが見つかりません。"
        echo "直接MySQLに接続して復元します。"
        mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-password}" "${DB_DATABASE:-laravel}" < "$BACKUP_FILE"
    fi
else
    # Dockerを使用しない場合
    mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-password}" "${DB_DATABASE:-laravel}" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ データベースの復元が正常に完了しました。"
    echo "📊 復元されたファイル: $BACKUP_FILE"
else
    echo "❌ データベースの復元に失敗しました。"
    exit 1
fi