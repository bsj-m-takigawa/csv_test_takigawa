# Issues (Specs, Performance, Security, DX)

## 1. API仕様の明確化と整備
- 種別: 仕様/保守
- 問題: users API の入出力スキーマ未定義。バリデーション/エラーフォーマットが画面毎に暗黙的。
- 影響: 破壊的変更の検知不可、フロント/バックで齟齬が発生。
- 対応: OpenAPI(Swagger) を backend に追加し、全エンドポイントのスキーマ/エラー形を定義。生成クライアント導入を検討。
- 成果物: openapi.yaml, CIでスキーマ検証。

## 2. SQLインジェクション/生SQLの排除
- 種別: セキュリティ
- 問題: UserController の show/update で RAW SQL 連結。
- 影響: 任意実行/情報漏えい。
- 対応: 全て Eloquent/Query Builder + バインドへ移行。findOrFail/update のみ使用。
- 成果物: コード修正、テスト追加。

## 3. マスアサインメント/権限逸脱
- 種別: セキュリティ
- 問題: $fillable に保護対象が含まれる可能性。$request->all() 使用。
- 影響: points 等の改ざん。
- 対応: FormRequest + validated() + allowlist のみ更新。$fillable の見直し。

## 4. 入力バリデーションの網羅
- 種別: 品質
- 問題: CSV/CRUD で検証不足。
- 対応: FormRequest で厳格化、email/日付/数値/unique/存在チェック。

## 5. CSVエクスポートのスケーラビリティ
- 種別: パフォーマンス
- 問題: 全件展開+文字列連結、N+1、メモリ圧迫。
- 対応: chunkById + StreamedResponse + ヘッダ行固定化。必要に応じてカンマ/改行の正規化。

## 6. CSVインポートの耐久性
- 種別: パフォーマンス/可用性
- 問題: 同期逐次処理でタイムアウト/途中失敗時の不整合。
- 対応: Queue化 + バルクインサート + DB::transaction + 行単位の検証/スキップレポート出力。

## 7. 一覧取得のサーバサイドページネーション
- 種別: パフォーマンス/UX
- 問題: 全件 fetch→クライアント側ページネーション。
- 対応: paginate() API + Front は page/per_page で再取得。総件数/ページ情報付与。

## 8. エラーハンドリング方針の統一
- 種別: DX/品質
- 問題: 例外→レスポンスの統一がない。
- 対応: 標準レスポンス形 {message, code, errors[]}。例外ハンドラでJSON整形。フロントはAxiosインターセプタで表示統一。

## 9. ロギング/監査
- 種別: 運用
- 問題: 重要操作（CSV取込/出力、更新/削除）の監査ログが不十分。
- 対応: 監査テーブル or structured logs。PII マスキング。失敗行の保存。

## 10. 環境変数/設定の整理
- 種別: セキュリティ/運用
- 問題: BASE URL 等の直書き懸念、.env 管理の徹底が必要。
- 対応: NEXT_PUBLIC_API_URL/backendのAPP_URLを使用、サンプルは .env.example へ。秘密情報はログ禁止。

## 11. CORS/CSRF/認可
- 種別: セキュリティ
- 問題: CORS 設定の明確化不足、保護APIの認可未定義。
- 対応: backend/config/cors.php 見直し、Sanctum or Token を導入。保護対象は認可ミドルウェア。

## 12. 型安全とAPIクライアント
- 種別: DX/品質
- 問題: Axiosの戻り型が疎。
- 対応: Zod/Pydantic相当のランタイムバリデーション or OpenAPI 生成型で厳格化。

## 13. フロントの状態管理/再利用
- 種別: 設計
- 問題: ページ直書きが多く、コンポーネント分割/ローディング・エラーUIの共通化が未整備。
- 対応: 共通 UI/フック(useUsers/useCsv) の導入。SWR/React Query の検討。

## 14. CI/自動化
- 種別: DX
- 問題: テスト/リンタ/型チェックのCIが未設定。
- 対応: GitHub Actions で frontend: lint/tsc/build、backend: phpunit/pint を実行。

## 15. テスト戦略の強化
- 種別: 品質
- 問題: サンプルテストのみ。
- 対応: ユーザCRUD/CSV入出力/ページネーション/バリデーション/例外/権限のFeatureテストを追加。工場でデータ生成。

## 16. 大容量ファイル対策
- 種別: 可用性/セキュリティ
- 問題: CSVアップロードのサイズ/行数制限・MIME検証が不足。
- 対応: サーバ側で max size/MIME/行数制限、ストレージは一時領域+期限付き削除。

## 17. フロントパフォーマンス
- 種別: パフォーマンス
- 問題: 画像/アイコン最適化、遅延読み込み設定の不足。
- 対応: next/image, dynamic import, React.lazy、Turbopack キャッシュの活用。

## 18. ドキュメント整備
- 種別: DX/運用
- 問題: 学習コスト高。
- 対応: README に起動/環境/API動線/CSV 仕様記載。CRUSH.md にコマンド追記を継続。
