# CRUSH.md

概要: Next.js(Frontend) + Laravel 10(Backend)。フロントは Node/npm、バックエンドは PHP Composer + Artisan + PHPUnit + Pint。Cursor/Copilot ルールは未検出。

Build/Dev (目的: ローカル開発/本番ビルドを素早く実行)
- Frontend 開発: cd frontend && npm run dev  # Next.js 開発サーバを起動
- Frontend 本番ビルド/起動: cd frontend && npm run build && npm run start  # 最適化ビルド→起動
- Backend サーバ: cd backend && php artisan serve  # Laravel 開発サーバ
- Docker 一括起動: docker-compose up --build  # 依存を隔離して再現性を確保

Lint/Format (目的: 一貫したコード品質と自動整形)
- Frontend ESLint: cd frontend && npm run lint  # Next.js 推奨設定で静的解析
- Backend Pint: cd backend && ./vendor/bin/pint -v  # PSR-12 準拠で整形

Typecheck/Tests (目的: 破壊的変更の早期検知と最小単位の検証)
- Frontend TypeScript: cd frontend && npm run typecheck  # 型チェック
- Frontend Lint: cd frontend && npm run lint  # ESLint
- Frontend Build: cd frontend && npm run build  # 本番ビルド検証
- Backend Pint: cd backend && composer run pint  # PSR-12 準拠で整形
- Backend 全テスト: cd backend && composer run test  # PHPUnit
- Backend 単一ファイル: cd backend && ./vendor/bin/phpunit tests/Feature/ExampleTest.php
- Backend 単一メソッド: cd backend && ./vendor/bin/phpunit --filter test_example_method

DB/Seed/Tasks (目的: 一貫した初期データ状態の再現)
- 初期化+Seed: cd backend && php artisan migrate --seed
- リセット+Seed: cd backend && php artisan migrate:fresh --seed
- Artisan 一覧: cd backend && php artisan list  # CSV 関連コマンド確認

コード規約 (目的: 可読性/保守性の最大化)
- Imports: Laravel は PSR-4 準拠の絶対 import; Next は ES Modules＋type-only import を優先
- Formatting: Prettier 未設定→Frontend は ESLint ルール、Backend は Pint(PSR-12)に従う
- Types: 可能な限り明示型/インターフェース; any 回避; Axios 応答は型で絞る
- Naming: PascalCase(コンポーネント/クラス), camelCase(変数/関数), SNAKE_CASE(.env)
- Error: 機密をログしない; Front は Axios を try/catch しユーザ安全な文言; Back は例外/バリデーションで 4xx/5xx を適切返却
- API: Front は frontend/src/lib/api/users.ts を経由; ベースURLは .env で管理し直書き禁止
- Security: Laravel バリデーション/CSRF/サンクタム; fillable で不正な一括代入防止; CSV 入力のサニタイズ; .env を commit しない

ソース構成ハイライト (参照先の把握を高速化)
- Frontend ルート: frontend/src/app/{users/list,users/detail/[id],users/add,users/edit/[id],users/delete/[id],users/import,users/export}
- API ラッパ: frontend/src/lib/api/users.ts (NEXT_PUBLIC_API_URL を使用)
- Backend ルート: backend/routes/api.php (users CRUD, users/all, import/export), web.php('/')</n- コントローラ: backend/app/Http/Controllers/{UserController.php,CsvController.php,PaginationController.php}
- モデル/DB: backend/app/Models/User.php, database/migrations/*, database/seeders/*, database/factories/UserFactory.php
- カスタムコマンド: backend/app/Console/Commands/{InitDatabase.php,InitDatabaseProduction.php,SqlInjectionDemo.php}
- CSV 関連: CsvController 経由; storage/app/public/error_csv_*.csv, temp_export.csv; 例: test_export.csv
- 既知の懸念: docs/risk/security_and_maintainability_risks.md, docs/risk/performance_issues.md を参照（検証/最適化の出発点）

補足
- Next.js App Router は frontend/src/app 配下。既定は Server Components を使用
- ドキュメント目次: docs/README.md
- 主要ドキュメント: 
  - 全体仕様: docs/system/system_spec.md
  - ユーザーAPI: docs/system/api/users.md, docs/system/api/users_basic_spec.md
  - UXガイド: docs/system/ux/ux_guidelines.md
  - リスク: docs/risk/*
  - レポート: docs/reports/*
  - バックログ: docs/backlog/*
- 新規の便利コマンドは本ファイルに追記して標準化
