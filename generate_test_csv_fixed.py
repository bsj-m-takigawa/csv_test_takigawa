#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修正版：大量データCSVテストファイル生成スクリプト
- 性別を英語形式に修正
- パスワード項目を追加
"""

import csv
import random
import sys
from datetime import datetime, timedelta

def generate_japanese_name():
    """日本名を生成"""
    surnames = ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤']
    given_names = ['太郎', '花子', '一郎', '美咲', '健太', '由美', '拓也', '恵子', '直人', '麻衣']
    return random.choice(surnames) + ' ' + random.choice(given_names)

def generate_email(domain_pool):
    """メールアドレスを生成"""
    romanized = f"user{random.randint(1000, 9999)}"
    return f"{romanized}@{random.choice(domain_pool)}"

def generate_phone():
    """電話番号を生成（日本の携帯電話形式）"""
    prefixes = ['090', '080', '070']
    return f"{random.choice(prefixes)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def generate_address():
    """住所を生成"""
    prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '埼玉県', '千葉県']
    cities = ['渋谷区', '新宿区', '港区', '品川区', '目黒区', '世田谷区']
    return f"{random.choice(prefectures)}{random.choice(cities)}{random.randint(1, 5)}-{random.randint(1, 20)}-{random.randint(1, 30)}"

def generate_birth_date():
    """生年月日を生成（18-80歳）"""
    start_date = datetime.now() - timedelta(days=80*365)
    end_date = datetime.now() - timedelta(days=18*365)
    
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    
    birth_date = start_date + timedelta(days=random_days)
    return birth_date.strftime('%Y-%m-%d')

def generate_membership_status():
    """会員状態を生成"""
    weights = {
        'active': 50,
        'inactive': 25,
        'pending': 15,
        'expired': 10
    }
    
    choices = []
    for status, weight in weights.items():
        choices.extend([status] * weight)
    
    return random.choice(choices)

def generate_notes():
    """メモを生成"""
    notes_pool = [
        'VIP顧客', '優良顧客', '要フォロー', 'キャンペーン対象',
        'サポート履歴あり', '定期購入者', 'トライアル中', '', '', ''
    ]
    return random.choice(notes_pool)

def generate_password():
    """簡易パスワード生成（バリデーション通過用）"""
    return "Password123!"

def generate_csv_data(num_records):
    """CSVデータを生成"""
    
    domains = ['gmail.com', 'yahoo.co.jp', 'hotmail.com', 'example.com', 'test.jp']
    
    # 修正されたヘッダー（パスワード項目追加）
    header = ['ID', '名前', 'メールアドレス', 'パスワード', '電話番号', '住所', '生年月日', '性別', 
             '会員状態', 'メモ', 'プロフィール画像', 'ポイント']
    
    data = [header]
    
    print(f"🚀 {num_records:,}件の修正版テストデータを生成中...")
    
    for i in range(1, num_records + 1):
        if i % 10000 == 0:
            print(f"  📊 {i:,}件生成完了...")
        
        record = [
            '',  # ID（空で新規作成）
            generate_japanese_name(),
            generate_email(domains),
            generate_password(),  # パスワード追加
            generate_phone(),
            generate_address(),
            generate_birth_date(),
            random.choice(['male', 'female', 'other']),  # 英語形式に修正
            generate_membership_status(),
            generate_notes(),
            '',  # プロフィール画像は空
            random.randint(0, 10000)
        ]
        
        data.append(record)
    
    return data

def main():
    num_records = 1000
    if len(sys.argv) > 1:
        try:
            num_records = int(sys.argv[1])
        except ValueError:
            print("❌ 引数は数値で指定してください")
            sys.exit(1)
    
    print(f"📝 修正版テストデータCSVを生成します（{num_records:,}件）")
    data = generate_csv_data(num_records)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"test_users_fixed_{num_records}_{timestamp}.csv"
    
    print(f"💾 ファイルに書き込み中: {filename}")
    try:
        # BOMなしUTF-8で出力
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(data)
        
        print(f"✅ 修正版生成完了！")
        print(f"   📄 ファイル名: {filename}")
        print(f"   📊 レコード数: {num_records:,}件")
        print(f"   🔧 修正内容:")
        print(f"      - 性別: 英語形式 (male/female/other)")
        print(f"      - パスワード: 固定値 'Password123!'")
        print(f"      - エンコーディング: UTF-8 (BOMなし)")
        
    except Exception as e:
        print(f"❌ ファイル書き込みエラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()