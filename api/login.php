<?php
// login.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->password)) {
    $username = $conn->real_escape_string($data->username);
    $password = $data->password;

    // Cari user berdasarkan username
    $query = "SELECT id, nama, kelas, username, password FROM users WHERE username = '$username'";
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        
        // Verifikasi kecocokan password
        if (password_verify($password, $row['password'])) {
            echo json_encode([
                "status" => "success",
                "message" => "Login berhasil!",
                "user" => [
                    "id" => $row['id'],
                    "nama" => $row['nama'],
                    "kelas" => $row['kelas'],
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