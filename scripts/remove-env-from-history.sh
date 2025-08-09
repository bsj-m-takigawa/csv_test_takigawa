#!/bin/bash

# .envファイルの安全性チェックスクリプト
# 注意: このスクリプトはGit履歴の書き換えは行いません

echo "========================================"
echo " .envファイル セキュリティチェック"
echo "========================================"
echo ""

# 現在の.envファイルの状態をチェック
echo "1. 現在の.envファイルの状態:"
echo "----------------------------------------"
if [ -f ".env" ]; then
    echo "⚠️  ルートディレクトリに.envファイルが存在します"
else
    echo "✅ ルートディレクトリに.envファイルはありません"
fi

if [ -f "backend/.env" ]; then
    echo "⚠️  backend/.envファイルが存在します"
else
    echo "✅ backend/.envファイルはありません"
fi

if [ -f "frontend/.env" ]; then
    echo "⚠️  frontend/.envファイルが存在します"
else
    echo "✅ frontend/.envファイルはありません"
fi

echo ""
echo "2. .gitignoreの設定確認:"
echo "----------------------------------------"
if grep -q "^\.env" .gitignore; then
    echo "✅ .envは.gitignoreに含まれています"
else
    echo "⚠️  .envが.gitignoreに含まれていません"
fi

echo ""
echo "3. Git履歴の確認:"
echo "----------------------------------------"
echo "過去のコミットで.envファイルが含まれているか確認中..."
ENV_COMMITS=$(git log --all --full-history --oneline -- "**/.env" "*.env" 2>/dev/null | wc -l)

if [ "$ENV_COMMITS" -gt 0 ]; then
    echo "⚠️  警告: Git履歴に.envファイルが含まれています ($ENV_COMMITS コミット)"
    echo ""
    echo "影響のあるコミット:"
    git log --all --full-history --oneline -- "**/.env" "*.env" | head -5
    echo ""
    echo "推奨される対応:"
    echo "1. 影響を受ける可能性のある認証情報をすべて変更"
    echo "2. 新しいAPIキー、パスワードを生成"
    echo "3. チームメンバーに通知"
    echo ""
    echo "注意: Git履歴の書き換えは影響が大きいため、"
    echo "      新しい認証情報への変更を優先してください。"
else
    echo "✅ Git履歴に.envファイルは含まれていません"
fi

echo ""
echo "========================================"
echo " チェック完了"
echo "========================================"