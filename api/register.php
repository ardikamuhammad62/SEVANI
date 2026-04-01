<?php
// register.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

// Menangkap data JSON dari frontend
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->nama) && !empty($data->kelas) && !empty($data->username) && !empty($data->password)) {
    
    $nama = $conn->real_escape_string($data->nama);
    $kelas = $conn->real_escape_string($data->kelas);
    $username = $conn->real_escape_string($data->username);
    $password = $data->password;

    // Cek apakah username sudah ada
    $cek_username = $conn->query("SELECT id FROM users WHERE username = '$username'");
    if ($cek_username->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Username sudah digunakan. Pilih yang lain."]);
        exit();
    }

    // Enkripsi password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Insert ke database
    $query = "INSERT INTO users (nama, kelas, username, password) VALUES ('$nama', '$kelas', '$username', '$hashed_password')";
    
    if ($conn->query($query) === TRUE) {
        echo json_encode([
            "status" => "success", 
            "message" => "Pendaftaran berhasil!",
            "user" => [
                "nama" => $nama,
                "kelas" => $kelas,
                "username" => $username
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal mendaftar: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
}

$conn->close();
?>