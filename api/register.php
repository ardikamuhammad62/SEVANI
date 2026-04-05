<?php
// api/register.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
ini_set('display_errors', '0');
mysqli_report(MYSQLI_REPORT_OFF);

function send_register_response(array $payload, int $httpCode = 200): void {
    if (!headers_sent()) {
        http_response_code($httpCode);
        header("Content-Type: application/json; charset=UTF-8");
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit();
}

register_shutdown_function(function () {
    $error = error_get_last();
    if (!$error) {
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($error['type'], $fatalTypes, true)) {
        return;
    }

    if (!headers_sent()) {
        http_response_code(200);
        header("Content-Type: application/json; charset=UTF-8");
    }

    echo json_encode([
        "status" => "error",
        "message" => "Terjadi kesalahan server saat pendaftaran."
    ], JSON_UNESCAPED_UNICODE);
});

require __DIR__ . '/koneksi.php';

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

    if (!is_object($data)) {
        send_register_response(["status" => "error", "message" => "Data request tidak valid."], 200);
    }

    $role = isset($data->role) ? strtolower(trim($data->role)) : 'murid';
    $nama = isset($data->nama) ? trim($data->nama) : '';
    $gender = isset($data->gender) ? strtolower(trim($data->gender)) : '';
    $gender_column = detectGenderColumn($conn);

    if ($nama === '' || ($gender !== 'laki-laki' && $gender !== 'perempuan')) {
        send_register_response(["status" => "error", "message" => "Data tidak lengkap."], 200);
    }

    $kelas = '';
    $no_absen = '';
    $agama = '';
    $username = '';
    $password_plain = isset($data->password) ? (string)$data->password : '';
    $nisn = '';
    $nip = '';

    if (strlen(trim($password_plain)) < 6) {
        send_register_response(["status" => "error", "message" => "Password minimal 6 karakter."], 200);
    }

    if ($role === 'guru') {
        $nip = isset($data->nip) ? preg_replace('/\D/', '', $data->nip) : '';
        if (!preg_match('/^\d{18}$/', $nip)) {
            send_register_response(["status" => "error", "message" => "NIP harus 18 digit angka."], 200);
        }

        $kelas = 'Guru';
        $no_absen = '0';
        $agama = '-';
        $username = $nip;
    } else {
        $role = 'murid';
        $kelas = isset($data->kelas) ? trim($data->kelas) : '';
        $no_absen = isset($data->noAbsen) ? trim($data->noAbsen) : (isset($data->no_absen) ? trim($data->no_absen) : '');
        $agama = isset($data->agama) ? trim($data->agama) : '';
        $nisn = isset($data->nisn) ? preg_replace('/\D/', '', $data->nisn) : '';

        if ($kelas === '' || $no_absen === '' || $agama === '') {
            send_register_response(["status" => "error", "message" => "Data murid belum lengkap."], 200);
        }
        if (!preg_match('/^\d+$/', $no_absen)) {
            send_register_response(["status" => "error", "message" => "Nomor absen harus berupa angka."], 200);
        }
        if (!preg_match('/^\d{10}$/', $nisn)) {
            send_register_response(["status" => "error", "message" => "NISN harus 10 digit angka."], 200);
        }

        $username = $nisn;
    }

    // Cek apakah nip_nisn sudah ada
    $stmt_check = $conn->prepare("SELECT id FROM users WHERE nip_nisn = ?");
    if (!$stmt_check) {
        send_register_response(["status" => "error", "message" => "Konfigurasi database belum sesuai untuk NIP/NISN."], 200);
    }

    $stmt_check->bind_param("s", $username);
    $stmt_check->execute();
    $stmt_check->store_result();
    if ($stmt_check->num_rows > 0) {
        send_register_response(["status" => "error", "message" => "NIP/NISN sudah terdaftar."], 200);
        $stmt_check->close();
    }
    $stmt_check->close();

    // Enkripsi password
    $hashed_password = password_hash($password_plain, PASSWORD_DEFAULT);

    // Insert ke database
    if ($gender_column !== '') {
        $stmt = $conn->prepare("INSERT INTO users (nama, kelas, no_absen, agama, nip_nisn, password, $gender_column) VALUES (?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            send_register_response(["status" => "error", "message" => "Struktur database users belum sesuai."], 200);
        }
        $stmt->bind_param("sssssss", $nama, $kelas, $no_absen, $agama, $username, $hashed_password, $gender);
    } else {
        $stmt = $conn->prepare("INSERT INTO users (nama, kelas, no_absen, agama, nip_nisn, password) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
            send_register_response(["status" => "error", "message" => "Struktur database users belum sesuai."], 200);
        }
        $stmt->bind_param("ssssss", $nama, $kelas, $no_absen, $agama, $username, $hashed_password);
    }

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        send_register_response([
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
        ], 200);
    } else {
        send_register_response(["status" => "error", "message" => "Gagal mendaftar."], 200);
    }
    $stmt->close();
} catch (Throwable $e) {
    send_register_response(["status" => "error", "message" => "Terjadi kesalahan server saat pendaftaran."], 200);
}

$conn->close();
?>