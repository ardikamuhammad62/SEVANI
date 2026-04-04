<?php
// api/register.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
ini_set('display_errors', '0');

require 'koneksi.php';

function detectGenderColumn($conn) {
    $candidates = ["jenis_kelamin", "gender"];
    foreach ($candidates as $col) {
        $safe_col = preg_replace('/[^a-zA-Z0-9_]/', '', $col);
        $res = $conn->query("SHOW COLUMNS FROM users LIKE '$safe_col'");
        if ($res && $res->num_rows > 0) {
            return $safe_col;
        }
    }
    return '';
}

try {
    // Menangkap data JSON dari frontend
    $data = json_decode(file_get_contents("php://input"));

    $role = isset($data->role) ? strtolower(trim($data->role)) : 'murid';
    $nama = isset($data->nama) ? trim($data->nama) : '';
    $gender = isset($data->gender) ? strtolower(trim($data->gender)) : '';
    $gender_column = detectGenderColumn($conn);

    if ($nama === '' || ($gender !== 'laki-laki' && $gender !== 'perempuan')) {
        echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
        exit();
    }

    $kelas = '';
    $no_absen = '';
    $agama = '';
    $username = '';
    $password_plain = '';
    $nisn = '';
    $nip = '';

    if ($role === 'guru') {
        $nip = isset($data->nip) ? preg_replace('/\D/', '', $data->nip) : '';
        if (!preg_match('/^\d{18}$/', $nip)) {
            echo json_encode(["status" => "error", "message" => "NIP harus 18 digit angka."]);
            exit();
        }

        $kelas = 'Guru';
        $no_absen = '0';
        $agama = '-';
        $username = $nip;
        $password_plain = $nip;
    } else {
        $role = 'murid';
        $kelas = isset($data->kelas) ? trim($data->kelas) : '';
        $no_absen = isset($data->noAbsen) ? trim($data->noAbsen) : (isset($data->no_absen) ? trim($data->no_absen) : '');
        $agama = isset($data->agama) ? trim($data->agama) : '';
        $nisn = isset($data->nisn) ? preg_replace('/\D/', '', $data->nisn) : '';

        if ($kelas === '' || $no_absen === '' || $agama === '') {
            echo json_encode(["status" => "error", "message" => "Data murid belum lengkap."]);
            exit();
        }
        if (!preg_match('/^\d+$/', $no_absen)) {
            echo json_encode(["status" => "error", "message" => "Nomor absen harus berupa angka."]);
            exit();
        }
        if (!preg_match('/^\d{10}$/', $nisn)) {
            echo json_encode(["status" => "error", "message" => "NISN harus 10 digit angka."]);
            exit();
        }

        $username = $nisn;
        $password_plain = $nisn;
    }

    // Cek apakah username sudah ada
    $stmt_check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt_check->bind_param("s", $username);
    $stmt_check->execute();
    $result_check = $stmt_check->get_result();
    if ($result_check->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Username sudah digunakan. Pilih yang lain."]);
        $stmt_check->close();
        exit();
    }
    $stmt_check->close();

    // Enkripsi password
    $hashed_password = password_hash($password_plain, PASSWORD_DEFAULT);

    // Insert ke database
    if ($gender_column !== '') {
        $stmt = $conn->prepare("INSERT INTO users (nama, kelas, no_absen, agama, username, password, $gender_column) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssss", $nama, $kelas, $no_absen, $agama, $username, $hashed_password, $gender);
    } else {
        $stmt = $conn->prepare("INSERT INTO users (nama, kelas, no_absen, agama, username, password) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $nama, $kelas, $no_absen, $agama, $username, $hashed_password);
    }

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        echo json_encode([
            "status" => "success",
            "message" => "Pendaftaran berhasil!",
            "user" => [
                "id" => $new_id,
                "role" => $role,
                "name" => $nama,
                "kelas" => $kelas,
                "noAbsen" => $role === 'murid' ? $no_absen : '',
                "agama" => $role === 'murid' ? $agama : '',
                "nisn" => $nisn,
                "nip" => $nip,
                "gender" => $gender,
                "username" => $username
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal mendaftar."]);
    }
    $stmt->close();
} catch (Throwable $e) {
    echo json_encode(["status" => "error", "message" => "Terjadi kesalahan server saat pendaftaran."]);
}

$conn->close();
?>