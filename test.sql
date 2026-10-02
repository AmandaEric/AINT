-- ==========================================================
-- schema.sql  -  run ONCE in MySQL Workbench (File > Open SQL Script)
-- Keeps your 4 tables and adds what the app needs.
-- First line: change "exam_db" to the name of your schema.
-- ==========================================================

USE exam_db;

-- ----------------------------------------------------------
-- 1. Make every ID auto-number itself (the "AI" box in Workbench).
--    Skip this part if you already ticked AI on all four ID columns.
-- ----------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE Admin       MODIFY Admin_id       INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Test        MODIFY Test_id        INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Students    MODIFY Students_id    INT NOT NULL AUTO_INCREMENT;
ALTER TABLE Test_Scores MODIFY Test_Scores_id INT NOT NULL AUTO_INCREMENT;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------
-- 2. Admin: emails can be longer than 45 characters, and each
--    email should exist only once
-- ----------------------------------------------------------
ALTER TABLE Admin
    MODIFY admin_email VARCHAR(254) NOT NULL,
    ADD UNIQUE INDEX uq_admin_email (admin_email);

-- ----------------------------------------------------------
-- 3. Test: unique code, a name, and a creation date
-- ----------------------------------------------------------
ALTER TABLE Test
    MODIFY code VARCHAR(45) NOT NULL,
    ADD UNIQUE INDEX uq_test_code (code),
    ADD COLUMN name       VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ----------------------------------------------------------
-- 4. Test_Scores: the grade, the AI's summary, and the answers
-- ----------------------------------------------------------
ALTER TABLE Test_Scores
    ADD COLUMN score_percent    INT          NULL,              -- NULL = AI grading failed
    ADD COLUMN grading_failed   TINYINT(1)   NOT NULL DEFAULT 0,
    ADD COLUMN summary          TEXT         NULL,
    ADD COLUMN duration_seconds INT          NULL,
    ADD COLUMN submitted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN details_json     LONGTEXT     NULL,              -- every question, answer, score, feedback
    ADD COLUMN email_sent       TINYINT(1)   NOT NULL DEFAULT 0;

-- ----------------------------------------------------------
-- 5. Students: "Studentscol" is Workbench's unused placeholder column
-- ----------------------------------------------------------
ALTER TABLE Students DROP COLUMN Studentscol;

-- ----------------------------------------------------------
-- 6. NEW: the questions that belong to each test
-- ----------------------------------------------------------
CREATE TABLE Questions (
    Question_id    INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Test_id        INT NOT NULL,
    category       ENUM('objective','semi','qualitative') NOT NULL,
    question_text  VARCHAR(1000) NOT NULL,
    CONSTRAINT fk_questions_test FOREIGN KEY (Test_id)
        REFERENCES Test (Test_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- 7. NEW: admin login (6-digit codes and who is logged in).
--    Codes and tokens are stored hashed, never as plain text.
-- ----------------------------------------------------------
CREATE TABLE Login_Codes (
    email       VARCHAR(254) NOT NULL PRIMARY KEY,
    code_hash   CHAR(64)     NOT NULL,
    expires_at  BIGINT       NOT NULL,
    attempts    INT          NOT NULL DEFAULT 0
);

CREATE TABLE Sessions (
    token_hash  CHAR(64) NOT NULL PRIMARY KEY,
    Admin_id    INT      NOT NULL,
    expires_at  BIGINT   NOT NULL,
    CONSTRAINT fk_sessions_admin FOREIGN KEY (Admin_id)
        REFERENCES Admin (Admin_id) ON DELETE CASCADE
);