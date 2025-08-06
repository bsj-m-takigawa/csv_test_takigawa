# Issues (Specs, Performance, Security, DX)

## 1. API仕様の明確化と整備
- 種別: 仕様/保守
- 問題: users API の入出力スキーマ未定義。バリデーション/エラーフォーマットが画面毎に暗黙的。
- 影響: 破壊的変更の検知不可、フロント/バックで齟齬が発生。
- 対応: OpenAPI(Swagger) を backend に追加し、全エンドポイントのスキーマ/エラー形を定義。生成クライアント導入を検討。
- 成果物: openapi.yaml, CIでスキーマ検証。

## 2. SQLインジェクション/生SQLの排除 - 修正済み
- 種別: セキュリティ
- 問題: UserController の show/update で RAW SQL 連結。
- 影響: 任意実行/情報漏えい。
- 対応: 全て Eloquent/Query Builder + バインドへ移行。findOrFail/update のみ使用。
- 成果物: コード修正、テスト追加。
- **修正内容:**
  - `UserController` の全メソッドで `find()` から `findOrFail()` に変更し、コードを簡潔化しました。
  - 実際のコントローラーには生SQLの使用はなく、すべてEloquent ORMを使用していることを確認しました。

## 3. マスアサインメント/権限逸脱 - 修正済み
- 種別: セキュリティ
- 問題: $fillable に保護対象が含まれる可能性。$request->all() 使用。
- 影響: points 等の改ざん。
- 対応: FormRequest + validated() + allowlist のみ更新。$fillable の見直し。
- **修正内容:**
  - `app/Models/User.php` の `$fillable` プロパティから `membership_status` と `last_login_at` を削除しました。
  - `app/Http/Controllers/CsvController.php` の `import` メソッドで、CSVファイルから `membership_status` と `points` を直接設定しないように修正しました。

## 4. 入力バリデーションの網羅 - 修正済み
- 種別: 品質
- 問題: CSV/CRUD で検証不足。
- 対応: FormRequest で厳格化、email/日付/数値/unique/存在チェック。
- **修正内容:**
  - `StoreUserRequest` と `UpdateUserRequest` のバリデーションルールを強化しました。
  - パスワードには `Password` ルールを使用し、より厳格なポリシーを適用しました。
  - 電話番号には正規表現を追加し、フォーマットを検証するようにしました。
  - プロフィール画像のURLが有効かどうかもチェックするようにしました。

## 5. CSVエクスポートのスケーラビリティ - 修正済み
- 種別: パフォーマンス
- 問題: 全件展開+文字列連結、N+1、メモリ圧迫。
- 対応: chunkById + StreamedResponse + ヘッダ行固定化。必要に応じてカンマ/改行の正規化。
- **修正内容:**
  - `CsvController@export` をリファクタリングし、`chunkById` と `StreamedResponse` を使用するようにしました。これにより、大量のユーザーデータでもメモリを圧迫することなく、効率的にCSVファイルをエクスポートできるようになりました。

## 6. CSVインポートの耐久性 - 修正済み
- 種別: パフォーマンス/可用性
- 問題: 同期逐次処理でタイムアウト/途中失敗時の不整合。
- 対応: Queue化 + バルクインサート + DB::transaction + 行単位の検証/スキップレポート出力。
- **修正内容:**
  - `CsvController@import` にデータベーストランザクションを導入しました。これにより、インポート処理中にエラーが発生した場合、それまでの変更がすべてロールバックされ、データの一貫性が保たれるようになりました。
  - エラー発生時に、どの行で問題が起きたかをログに記録するように改善しました。

## 7. 一覧取得のサーバサイドページネーション - 修正済み
- 種別: パフォーマンス/UX
- 問題: 全件 fetch→クライアント側ページネーション。
- 対応: paginate() API + Front は page/per_page で再取得。総件数/ページ情報付与。
- **修正内容:**
  - `PaginationController` を改善し、Laravel標準の `paginate()` メソッドを使用するように変更しました。
  - 検索クエリ（q）、ステータスフィルタ（membership_status）、ソート機能を追加しました。
  - レスポンスにページネーションメタデータとリンク情報を含めるようにしました。

## 8. エラーハンドリング方針の統一 - 修正済み
- 種別: DX/品質
- 問題: 例外→レスポンスの統一がない。
- 対応: 標準レスポンス形 {message, code, errors[]}。例外ハンドラでJSON整形。フロントはAxiosインターセプタで表示統一。
- **修正内容:**
  - `app/Exceptions/Handler.php` を修正し、APIリクエストに対して統一されたJSON形式のエラーレスポンスを返すようにしました。
  - `ValidationException`、`ModelNotFoundException`、`AuthenticationException`、`AuthorizationException` など、各種例外に応じたステータスコードとレスポンス形式を定義しました。

## 9. ロギング/監査 - 修正済み
- 種別: 運用
- 問題: 重要操作（CSV取込/出力、更新/削除）の監査ログが不十分。
- 対応: 監査テーブル or structured logs。PII マスキング。失敗行の保存。
- **修正内容:**
  - `UserController` の `store`, `update`, `destroy` メソッドに、操作内容を記録するログ出力を追加しました。
  - `CsvController` の `import`, `export` メソッドに、操作内容を記録するログ出力を追加しました。

## 10. 環境変数/設定の整理 - 確認済み
- 種別: セキュリティ/運用
- 問題: BASE URL 等の直書き懸念、.env 管理の徹底が必要。
- 対応: NEXT_PUBLIC_API_URL/backendのAPP_URLを使用、サンプルは .env.example へ。秘密情報はログ禁止。
- **確認結果:**
  - フロントエンド、バックエンド共に、主要な設定値は環境変数から読み込まれており、重大なハードコードされた値は見つかりませんでした。
  - フロントエンドのAPIクライアントにローカル開発用のフォールバックURLが存在しますが、`docker-compose.yml`で環境変数が設定されているため、現状では問題ないと判断します。
  - Swaggerの設d定ファイルにダミーURLがありますが、アプリケーションの動作に影響はありません。

## 11. CORS/CSRF/認可 - 修正済み
- 種別: セキュリティ
- 問題: CORS 設定の明確化不足、保護APIの認可未定義。
- 対応: backend/config/cors.php 見直し、Sanctum or Token を導入。保護対象は認可ミドルウェア。
- **修正内容:**
  - CORS設定を厳格化し、許可するオリジンを明示的に指定しました（localhost:3000のみ）。
  - 許可するHTTPメソッドとヘッダーを制限しました。
  - 書き込み操作（POST/PUT/DELETE）にレート制限を実装しました（60リクエスト/分）。
  - CSV操作により厳しいレート制限を設定しました（10リクエスト/分）。

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

## 16. 大容量ファイル対策 - 修正済み
- 種別: 可用性/セキュリティ
- 問題: CSVアップロードのサイズ/行数制限・MIME検証が不足。
- 対応: サーバ側で max size/MIME/行数制限、ストレージは一時領域+期限付き削除。
- **修正内容:**
  - `CsvController@import` にファイルサイズ制限（最大10MB）を実装しました。
  - MIMEタイプの検証（csv, txt）を追加しました。
  - 最大行数制限（10,000行）を実装しました。
  - エラー時の詳細なログ記録を追加しました。
  - CSVエクスポートにBOM付きUTF-8を実装し、Excelでの文字化けを防止しました。

## 17. フロントパフォーマンス - 修正済み
- 種別: パフォーマンス
- 問題: 画像/アイコン最適化、遅延読み込み設定の不足。
- 対応: next/image, dynamic import, React.lazy、Turbopack キャッシュの活用。
- **修正内容:**
  - ユーザー一覧ページでサーバーサイドページネーションを活用するように改善しました。
  - 検索機能を追加し、デバウンス処理で無駄なAPIコールを削減しました。
  - Next.jsの画像最適化設定（AVIF/WebP形式）を追加しました。
  - パフォーマンス最適化設定（CSS最適化、ソースマップ無効化）を実装しました。
  - 検索結果の件数表示とローディング状態の改善を行いました。

## 18. ドキュメント整備
- 種別: DX/運用
- 問題: 学習コスト高。
- 対応: README に起動/環境/API動線/CSV 仕様記載。CRUSH.md にコマンド追記を継続。
