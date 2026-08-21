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
