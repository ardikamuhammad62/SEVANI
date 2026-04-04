<?php
// api/verify_session.php
error_reporting(0);
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

require 'koneksi.php';

$username = isset($_GET['username']) ? $conn->real_escape_string($_GET['username']) : '';

if (!empty($username)) {
    $query = "SELECT id, nama, kelas, no_absen, agama, nip_nisn, jenis_kelamin FROM users WHERE nip_nisn = '$username'";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $role = strtolower((string)$row['kelas']) === 'guru' ? 'guru' : 'murid';
        $gender = isset($row['jenis_kelamin']) ? strtolower(trim((string)$row['jenis_kelamin'])) : '';
        if ($gender !== 'laki-laki' && $gender !== 'perempuan') {
            $gender = '';
        }
        
        echo json_encode([
            "status" => "success",
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
        echo json_encode(["status" => "error", "message" => "User tidak ditemukan."], JSON_UNESCAPED_UNICODE);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Username diperlukan."], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>