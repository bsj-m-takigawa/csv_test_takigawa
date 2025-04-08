<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class InitDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:init-database-test {--fresh : 既存のテーブルを削除して再作成する}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'データベースを初期化し、テスト用の1,000件のシードデータを投入します';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('テスト用データベースの初期化を開始します...');

        if ($this->option('fresh')) {
            $this->info('既存のテーブルを削除して再作成します...');
            Artisan::call('migrate:fresh', ['--force' => true]);
        } else {
            $this->info('マイグレーションを実行します...');
            Artisan::call('migrate', ['--force' => true]);
        }

        $this->info('シードデータを投入します（1,000件のユーザーデータ）...');
        
        Artisan::call('db:seed', [
            '--force' => true,
            '--class' => 'Database\\Seeders\\TestDatabaseSeeder'
        ]);
        
        $this->info('テスト用データベースの初期化が完了しました！');
        $this->info('アプリケーションの準備ができました。');
        
        return Command::SUCCESS;
    }
}
