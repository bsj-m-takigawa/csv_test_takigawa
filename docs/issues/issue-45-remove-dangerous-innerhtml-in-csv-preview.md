# Issue #45: CSVプレビューの危険なinnerHTML除去と安全なハイライト実装

## 概要
CSVプレビュー画面で、検索語のハイライトに `dangerouslySetInnerHTML` を使用しており、CSV由来の未サニタイズ文字列がDOMに挿入される危険がある。

## 影響
- XSSにより `localStorage` の認証トークン奪取リスク
- ユーザー端末上での任意スクリプト実行

## 対象
- `frontend/src/app/users/import/page.tsx`（~751, ~778行付近）

## 対応方針
1. `dangerouslySetInnerHTML` を廃止
2. ハイライトは「文字列分割 + Reactノード組み立て」で安全に実装
3. 可能であれば共通ヘルパー（utils）化

## 受け入れ基準
- XSSペイロード（例: `<img src=x onerror=alert(1)>`）がDOMに挿入されない
- 既存のハイライトUXを維持

## 参考
- セキュリティレビュー（2025-08-10）: docs/reports/security-review-2025-08-10.md
