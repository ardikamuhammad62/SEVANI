<?php
// api/login.php
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

    // Cari user berdasarkan username
    $query = "SELECT id, nama, kelas, no_absen, agama, username, password$gender_select FROM users WHERE username = '$username'";
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
                    "nama" => $row['nama'],
                    "kelas" => $row['kelas'],
                    "no_absen" => $role === 'murid' ? $row['no_absen'] : '',
                    "agama" => $role === 'murid' ? $row['agama'] : '',
                    "role" => $role,
                    "nisn" => $role === 'murid' ? $row['username'] : '',
                    "nip" => $role === 'guru' ? $row['username'] : '',
                    "gender" => $gender,
                    "username" => $row['username']
                ]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Password salah."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Username tidak ditemukan."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Username dan Password harus diisi."]);
}

$conn->close();
?>