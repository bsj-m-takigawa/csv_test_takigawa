#!/bin/bash

# .envファイルをGit履歴から削除するスクリプト

echo "警告: このスクリプトはGit履歴を書き換えます。"
echo "実行前に必ずバックアップを取ってください。"
echo ""
read -p "続行しますか？ (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "中止しました。"
    exit 1
fi

echo "Git履歴から.envファイルを削除しています..."

# filter-branchを使用して履歴から.envファイルを削除
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch backend/.env frontend/.env' \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "完了しました。"
echo ""
echo "次のステップ:"
echo "1. 新しい認証情報を生成して.envファイルを更新"
echo "2. force pushでリモートリポジトリを更新:"
echo "   git push --force --all"
echo "   git push --force --tags"
echo ""
echo "警告: force pushは他の開発者の作業に影響を与える可能性があります。"
echo "チームメンバーに通知してください。"