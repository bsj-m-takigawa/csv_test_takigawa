<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 検索で使用される列にインデックスを追加
            $table->index('name', 'idx_users_name');
            $table->index('phone_number', 'idx_users_phone_number');
            $table->index('membership_status', 'idx_users_membership_status');
            $table->index('created_at', 'idx_users_created_at');
            $table->index('updated_at', 'idx_users_updated_at');

            // 複合インデックス（よく一緒に使われる条件）
            $table->index(['membership_status', 'created_at'], 'idx_users_status_created');
            $table->index(['membership_status', 'updated_at'], 'idx_users_status_updated');
        });

        // フルテキストインデックス（MySQL専用）
        if (config('database.default') === 'mysql') {
            Schema::table('users', function (Blueprint $table) {
                $table->fulltext(['name', 'email'], 'fulltext_users_name_email');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // インデックスを削除
            $table->dropIndex('idx_users_name');
            $table->dropIndex('idx_users_phone_number');
            $table->dropIndex('idx_users_membership_status');
            $table->dropIndex('idx_users_created_at');
            $table->dropIndex('idx_users_updated_at');
            $table->dropIndex('idx_users_status_created');
            $table->dropIndex('idx_users_status_updated');
        });

        // フルテキストインデックス（MySQL専用）
        if (config('database.default') === 'mysql') {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('fulltext_users_name_email');
            });
        }
    }
};
