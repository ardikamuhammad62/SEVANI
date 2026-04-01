<?php
// api/login.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {
    $username = $conn->real_escape_string($data->username);
    $password = $data->password;

    // Tambahkan no_absen dan agama pada bagian SELECT
    $query = "SELECT id, nama, kelas, no_absen, agama, username, password FROM users WHERE username = '$username'";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        if (password_verify($password, $row['password'])) {
            echo json_encode([
                "status" => "success",
                "message" => "Login berhasil!",
                "user" => [
                    "id" => $row['id'],
                    "nama" => $row['nama'],
                    "kelas" => $row['kelas'],
                    "noAbsen" => $row['no_absen'],
                    "agama" => $row['agama'],
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