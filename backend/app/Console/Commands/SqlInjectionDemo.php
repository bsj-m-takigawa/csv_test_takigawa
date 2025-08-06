<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SqlInjectionDemo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sql-injection-demo {id? : ユーザーID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'SQLインジェクションの脆弱性をデモンストレーションします';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $id = $this->argument('id') ?? '1 OR 1=1; DELETE FROM users WHERE id > 10; --';

        $this->info('SQLインジェクションデモを実行します...');
        $this->info('実行するSQL: SELECT * FROM users WHERE id = '.$id);

        try {
            $results = DB::select('SELECT * FROM users WHERE id = ?', [$id]);
            $this->info('取得したユーザー数: '.count($results));
            if (count($results) == 1) {
                $this->info('ユーザー情報: '.json_encode($results[0]));
            } else {
                $this->error('ユーザーが見つかりませんでした。');
            }
        } catch (\Exception $e) {
            $this->error('エラーが発生しました: '.$e->getMessage());
        }

        return Command::SUCCESS;
    }
}
