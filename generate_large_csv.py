#!/usr/bin/env python3
import csv
import random
import faker
from datetime import datetime, timedelta

# Faker インスタンスを作成（日本語）
fake = faker.Faker('ja_JP')

# 生成する件数
NUM_RECORDS = 10000

# CSVヘッダー
HEADERS = [
    'ID',
    '名前', 
    'メールアドレス',
    '電話番号',
    '住所',
    '生年月日', 
    '性別',
    '会員状態',
    'メモ',
    'プロフィール画像',
    'ポイント',
    '最終ログイン',
    '作成日',
    '更新日'
]

# 会員状態の選択肢
STATUSES = ['active', 'inactive', 'pending', 'expired']

# 性別の選択肢  
GENDERS = ['male', 'female', 'other']

def generate_user_data(index):
    """ユーザーデータを生成"""
    
    # 基本情報
    name = fake.name()
    email = f"user{index:05d}@example.com"  # 重複しないメールアドレス
    
    # 電話番号（一部は空）
    phone = fake.phone_number() if random.random() > 0.1 else ""
    
    # 住所（一部は空、改行文字を完全に除去）
    if random.random() > 0.15:
        address = fake.address().replace('\n', ' ').replace('\r', ' ').replace('  ', ' ')
    else:
        address = ""
    
    # 生年月日
    birth_date = fake.date_of_birth(minimum_age=18, maximum_age=80).strftime('%Y-%m-%d')
    
    # 性別
    gender = random.choice(GENDERS)
    
    # 会員状態  
    status = random.choice(STATUSES)
    
    # メモ（一部のみ、改行文字を除去）
    if random.random() > 0.7:
        notes = fake.text(max_nb_chars=100).replace('\n', ' ').replace('\r', ' ')
    else:
        notes = ""
    
    # プロフィール画像（一部のみ）
    profile_image = f"profile_{index:05d}.jpg" if random.random() > 0.6 else ""
    
    # ポイント
    points = random.randint(0, 10000)
    
    # 最終ログイン（一部は空）
    if random.random() > 0.3:
        last_login = fake.date_time_between(start_date='-1y', end_date='now').strftime('%Y-%m-%d %H:%M:%S')
    else:
        last_login = ""
    
    # 作成日
    created_at = fake.date_time_between(start_date='-2y', end_date='-1d').strftime('%Y-%m-%d %H:%M:%S')
    
    # 更新日
    updated_at = fake.date_time_between_dates(
        datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S'), 
        datetime.now()
    ).strftime('%Y-%m-%d %H:%M:%S')
    
    return [
        '',  # ID は空（新規作成時）
        name,
        email,
        phone,
        address,
        birth_date,
        gender,
        status,
        notes,
        profile_image,
        str(points),
        last_login,
        created_at,
        updated_at
    ]

def main():
    """メイン処理"""
    filename = 'test-data/users_large_10000.csv'
    
    print(f"Generating {NUM_RECORDS} user records...")
    
    with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        # CSVライターの設定：クォートを適切に処理
        writer = csv.writer(csvfile, quoting=csv.QUOTE_MINIMAL)
        
        # ヘッダー行を書き込み
        writer.writerow(HEADERS)
        
        # データ行を生成・書き込み
        for i in range(1, NUM_RECORDS + 1):
            user_data = generate_user_data(i)
            
            # データの妥当性チェック
            cleaned_data = []
            for field in user_data:
                if isinstance(field, str):
                    # 改行文字とタブ文字を除去、カンマをエスケープ
                    cleaned_field = field.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ').strip()
                    cleaned_data.append(cleaned_field)
                else:
                    cleaned_data.append(field)
            
            writer.writerow(cleaned_data)
            
            # 進捗表示
            if i % 1000 == 0:
                print(f"Generated {i:,} records...")
    
    # ファイルサイズを正確に計算
    import os
    file_size = os.path.getsize(filename)
    
    print(f"\n✅ Successfully generated {NUM_RECORDS:,} records in '{filename}'")
    print(f"📁 File size: {round(file_size / (1024*1024), 2)} MB")
    
    # 生成されたファイルの行数を確認
    with open(filename, 'r', encoding='utf-8-sig') as f:
        line_count = sum(1 for line in f)
    print(f"📄 Total lines: {line_count} (should be {NUM_RECORDS + 1})")
    
    return filename

if __name__ == "__main__":
    main()