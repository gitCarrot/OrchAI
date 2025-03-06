-- 기본 시스템 카테고리 생성
INSERT INTO categories (type, icon, created_at, updated_at)
VALUES 
  ('system', '🥬', NOW(), NOW()),
  ('system', '🥩', NOW(), NOW()),
  ('system', '🐟', NOW(), NOW()),
  ('system', '🥛', NOW(), NOW()),
  ('system', '🥚', NOW(), NOW()),
  ('system', '🍶', NOW(), NOW()),
  ('system', '🥫', NOW(), NOW());

-- 카테고리 번역 추가
INSERT INTO category_translations (category_id, language, name, created_at, updated_at)
VALUES 
  (1, 'ko', '채소/과일', NOW(), NOW()),
  (1, 'en', 'Vegetables/Fruits', NOW(), NOW()),
  (1, 'ja', '野菜/果物', NOW(), NOW()),
  
  (2, 'ko', '육류', NOW(), NOW()),
  (2, 'en', 'Meat', NOW(), NOW()),
  (2, 'ja', '肉類', NOW(), NOW()),
  
  (3, 'ko', '해산물', NOW(), NOW()),
  (3, 'en', 'Seafood', NOW(), NOW()),
  (3, 'ja', '魚介類', NOW(), NOW()),
  
  (4, 'ko', '유제품', NOW(), NOW()),
  (4, 'en', 'Dairy', NOW(), NOW()),
  (4, 'ja', '乳製品', NOW(), NOW()),
  
  (5, 'ko', '계란/달걀', NOW(), NOW()),
  (5, 'en', 'Eggs', NOW(), NOW()),
  (5, 'ja', '卵', NOW(), NOW()),
  
  (6, 'ko', '양념/소스', NOW(), NOW()),
  (6, 'en', 'Seasonings/Sauces', NOW(), NOW()),
  (6, 'ja', '調味料/ソース', NOW(), NOW()),
  
  (7, 'ko', '가공식품', NOW(), NOW()),
  (7, 'en', 'Processed Foods', NOW(), NOW()),
  (7, 'ja', '加工食品', NOW(), NOW()); 