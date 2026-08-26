-- Dikkat Geliştirme Uygulaması — PostgreSQL şeması
-- db.json'daki veri modeliyle birebir aynı alanlar; sadece kalıcı ve indeksli.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    teacher_id UUID REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kullanıcı adı sistem genelinde unique (case-insensitive) — backend garantisi burada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(username_lower);
CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
-- Öğrenci listesi arama (ad/soyad/kullanıcı adı) için.
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users (lower(first_name || ' ' || last_name));

CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL UNIQUE REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'InProgress', 'Completed')),
    total_questions INT NOT NULL DEFAULT 150,
    current_index INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    final_score INT,
    correct_count INT,
    wrong_count INT
);

-- status: öğrenci listesi filtresi ve "Sınav Durumu" dağılımında sık WHERE/
-- FILTER hedefi. completed_at: "Son Aktiviteler" ORDER BY ... DESC LIMIT ve
-- tarih aralığı filtrelerinde kullanılıyor — büyük tablo boyutunda ikisi de
-- sıralı/koşullu tarama yerine index taramasına ihtiyaç duyar.
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_completed_at ON exam_attempts(completed_at);

CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY,
    exam_attempt_id UUID NOT NULL REFERENCES exam_attempts(id),
    question_index INT NOT NULL,
    question_id TEXT NOT NULL,
    student_answer JSONB,
    is_correct BOOLEAN NOT NULL,
    attempt_count INT NOT NULL,
    score INT NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_spent_seconds INT,
    UNIQUE (exam_attempt_id, question_index)
);

-- Var olan veritabanlarında answers tablosu zaten oluşturulmuş olabileceği için
-- (CREATE TABLE IF NOT EXISTS yeni sütun eklemez) sütunu ayrıca burada ekliyoruz.
ALTER TABLE answers ADD COLUMN IF NOT EXISTS time_spent_seconds INT;

CREATE INDEX IF NOT EXISTS idx_answers_attempt ON answers(exam_attempt_id);
-- Kategori/soru bazlı toplulaştırma (fetchQuestionAggregates) question_id
-- üzerinden GROUP BY yapıyor — cevap sayısı büyüdükçe bu index olmadan tam
-- tablo taraması gerekir.
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- Öğrencinin kişisel soru sırası — oluşturulduğu andaki aktif sorulardan
-- hesaplanıp burada donar (bkz. db.js createExamAttemptForStudent). NULL ise
-- (mevcut/eski kayıtlar) sabit EXAM_QUESTIONS listesi kullanılır — davranış
-- hiç değişmez. Bir soru sonradan pasifleştirilse bile zaten başlamış bir
-- öğrencinin sırası bozulmaz.
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS question_list JSONB;

-- Sınav Yönetimi ekranındaki kategori yönetimi için gerçek, düzenlenebilir
-- kategori kayıtları (önceden yalnızca anahtar-kelime eşlemesiyle anlık
-- hesaplanıyordu — bkz. questionCategories.js, o hâlâ fallback olarak durur).
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 150 gerçek sorunun (ve admin tarafından eklenen taslak soruların) yönetici
-- panelinden düzenlenebilen metadata'sı. Sorunun kendi interaktif içeriği
-- (görsel/mantık) hâlâ src/app/features altındaki component'ten gelir —
-- burada yalnızca kategori ataması, aktif/pasif durumu ve görünen başlık tutulur.
CREATE TABLE IF NOT EXISTS question_meta (
    question_id TEXT PRIMARY KEY,
    category_id UUID REFERENCES categories(id),
    active BOOLEAN NOT NULL DEFAULT true,
    is_draft BOOLEAN NOT NULL DEFAULT false,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_meta_category ON question_meta(category_id);
