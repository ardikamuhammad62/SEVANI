-- Update database untuk mengubah username menjadi nip_nisn dan tambah jenis_kelamin

-- Ganti nama kolom username menjadi nip_nisn
ALTER TABLE users CHANGE username nip_nisn VARCHAR(50) UNIQUE NOT NULL;

-- Tambah kolom jenis_kelamin jika belum ada
ALTER TABLE users ADD COLUMN jenis_kelamin VARCHAR(20) DEFAULT NULL;