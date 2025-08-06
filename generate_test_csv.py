#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大量データCSVテストファイル生成スクリプト
Usage: python generate_test_csv.py [行数]
"""

import csv
import random
import sys
from datetime import datetime, timedelta
import uuid

def generate_japanese_name():
    """日本名を生成"""
    surnames = ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤',
               '吉田', '山田', '松本', '井上', '木村', '林', '清水', '山崎', '森', '池田',
               '橋本', '山口', '松田', '中島', '石川', '前田', '藤田', '後藤', '岡田', '長谷川']
    
    given_names = ['太郎', '花子', '一郎', '美咲', '健太', '由美', '拓也', '恵子', '直人', '麻衣',
                  '雄一', '智子', '良太', '真理', '浩二', '京子', '秀樹', '裕子', '和也', '理恵',
                  '修一', '典子', '康夫', '奈美', '正男', '幸子', '博之', '良子', '隆', '節子']
    
    return random.choice(surnames) + ' ' + random.choice(given_names)

def generate_email(name, domain_pool):
    """メールアドレスを生成"""
    domains = domain_pool
    # 名前からローマ字風の文字列を生成（簡易版）
    name_part = name.replace(' ', '.').lower()
    # 日本語を英数字に変換（簡易版）
    romanized = f"user{random.randint(1000, 9999)}"
    return f"{romanized}@{random.choice(domains)}"

def generate_phone():
    """電話番号を生成（日本の携帯電話形式）"""
    prefixes = ['090', '080', '070']
    return f"{random.choice(prefixes)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def generate_address():
    """住所を生成"""
    prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '埼玉県', '千葉県', '福岡県', '北海道',
                  '兵庫県', '静岡県', '茨城県', '広島県', '京都府', '宮城県', '新潟県']
    
    cities = ['渋谷区', '新宿区', '港区', '品川区', '目黒区', '世田谷区', '中央区', '千代田区',
             '横浜市', '川崎市', '相模原市', '名古屋市', '大阪市', '神戸市', '京都市']
    
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
    """会員状態を生成（実際の分布を考慮）"""
    # アクティブユーザーが多めの分布
    weights = {
        'active': 50,     # 50%
        'inactive': 25,   # 25%
        'pending': 15,    # 15%
        'expired': 10     # 10%
    }
    
    choices = []
    for status, weight in weights.items():
        choices.extend([status] * weight)
    
    return random.choice(choices)

def generate_notes():
    """メモを生成"""
    notes_pool = [
        'VIP顧客', '優良顧客', '要フォロー', '問い合わせ多数', 'キャンペーン対象',
        'サポート履歴あり', '特別対応必要', '定期購入者', '紹介者', '長期利用者',
        'トライアル中', '解約検討中', 'アップグレード候補', '満足度調査対象', '',
        '', '', '', '', ''  # 空のメモも含める
    ]
    return random.choice(notes_pool)

def generate_csv_data(num_records):
    """CSVデータを生成"""
    
    domains = ['gmail.com', 'yahoo.co.jp', 'hotmail.com', 'example.com', 'test.jp', 
              'sample.co.jp', 'demo.net', 'company.jp', 'mail.com', 'outlook.jp']
    
    # ヘッダー
    header = ['ID', '名前', 'メールアドレス', '電話番号', '住所', '生年月日', '性別', 
             '会員状態', 'メモ', 'プロフィール画像', 'ポイント']
    
    data = [header]
    
    print(f"🚀 {num_records:,}件のテストデータを生成中...")
    
    for i in range(1, num_records + 1):
        if i % 10000 == 0:
            print(f"  📊 {i:,}件生成完了...")
        
        # IDは空にして新規作成扱いにする
        record = [
            '',  # ID（空で新規作成）
            generate_japanese_name(),
            generate_email('user', domains),
            generate_phone(),
            generate_address(),
            generate_birth_date(),
            random.choice(['男性', '女性', 'その他']),
            generate_membership_status(),
            generate_notes(),
            '',  # プロフィール画像は空
            random.randint(0, 10000)  # ポイント
        ]
        
        data.append(record)
    
    return data

def main():
    # コマンドライン引数から行数を取得（デフォルト50,000件）
    num_records = 50000
    if len(sys.argv) > 1:
        try:
            num_records = int(sys.argv[1])
        except ValueError:
            print("❌ 引数は数値で指定してください")
            sys.exit(1)
    
    if num_records > 100000:
        print("⚠️  10万件を超える大量データです。処理時間がかかる可能性があります。")
        response = input("続行しますか？ (y/N): ")
        if response.lower() != 'y':
            print("処理をキャンセルしました。")
            sys.exit(0)
    
    # データ生成
    print(f"📝 大量テストデータCSVを生成します（{num_records:,}件）")
    data = generate_csv_data(num_records)
    
    # ファイル名生成
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"test_users_bulk_{num_records}_{timestamp}.csv"
    
    # CSV出力
    print(f"💾 ファイルに書き込み中: {filename}")
    try:
        with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerows(data)
        
        file_size = round(len(str(data)) / 1024 / 1024, 2)
        print(f"✅ 生成完了！")
        print(f"   📄 ファイル名: {filename}")
        print(f"   📊 レコード数: {num_records:,}件")
        print(f"   💾 概算サイズ: ~{file_size}MB")
        print(f"   🎯 会員状態分布:")
        print(f"      - アクティブ: ~{num_records*0.5:,.0f}件 (50%)")
        print(f"      - 非アクティブ: ~{num_records*0.25:,.0f}件 (25%)")
        print(f"      - 保留中: ~{num_records*0.15:,.0f}件 (15%)")
        print(f"      - 期限切れ: ~{num_records*0.1:,.0f}件 (10%)")
        
        print(f"\n📁 インポート方法:")
        print(f"   1. ファイルをブラウザでアップロード")
        print(f"   2. または Docker内にコピー:")
        print(f"      docker cp {filename} internship-challenge-backend:/tmp/")
        
    except Exception as e:
        print(f"❌ ファイル書き込みエラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()