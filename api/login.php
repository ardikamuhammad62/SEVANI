<?php
// api/login.php
error_reporting(0);
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

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

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {
    $username = $conn->real_escape_string($data->username);
    $password = $data->password;
    $gender_column = detectGenderColumn($conn);
    $gender_select = $gender_column !== '' ? ", $gender_column AS gender" : '';

    // Cari user berdasarkan nip_nisn
    $query = "SELECT id, nama, kelas, no_absen, agama, nip_nisn, password$gender_select FROM users WHERE nip_nisn = '$username'";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        if (password_verify($password, $row['password'])) {
            $role = strtolower((string)$row['kelas']) === 'guru' ? 'guru' : 'murid';
            $gender = isset($row['gender']) ? strtolower(trim((string)$row['gender'])) : '';
            if ($gender !== 'laki-laki' && $gender !== 'perempuan') {
                $gender = '';
            }
            echo json_encode([
                "status" => "success",
                "message" => "Login berhasil!",
                "user" => [
                    "id" => $row['id'],
                    "name" => $row['nama'],
                    "kelas" => $row['kelas'],
                    "noAbsen" => $role === 'murid' ? $row['no_absen'] : '',
                    "agama" => $role === 'murid' ? $row['agama'] : '',
                    "role" => $role,
                    "nisn" => $role === 'murid' ? $row['nip_nisn'] : '',
                    "nip" => $role === 'guru' ? $row['nip_nisn'] : '',
                    "gender" => $gender,
                    "username" => $row['nip_nisn']
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode(["status" => "error", "message" => "Password salah."], JSON_UNESCAPED_UNICODE);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "NIP/NISN tidak ditemukan."], JSON_UNESCAPED_UNICODE);
    }
} else {
    echo json_encode(["status" => "error", "message" => "NIP/NISN dan password harus diisi."], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>