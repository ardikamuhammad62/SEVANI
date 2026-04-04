<?php
// api/register.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

// Tambahkan pengecekan untuk noAbsen dan agama
if (!empty($data->nama) && !empty($data->kelas) && !empty($data->username) && !empty($data->password) && !empty($data->agama) && !empty($data->noAbsen)) {
    
    $nama = $conn->real_escape_string($data->nama);
    $kelas = $conn->real_escape_string($data->kelas);
    $no_absen = (int)$data->noAbsen;
    $agama = $conn->real_escape_string($data->agama);
    $username = $conn->real_escape_string($data->username);
    $password = $data->password;

    $cek_username = $conn->query("SELECT id FROM users WHERE username = '$username'");
    if ($cek_username->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Username sudah digunakan. Pilih yang lain."]);
        exit();
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Masukkan no_absen dan agama ke query INSERT
    $query = "INSERT INTO users (nama, kelas, no_absen, agama, username, password) 
              VALUES ('$nama', '$kelas', $no_absen, '$agama', '$username', '$hashed_password')";
    
    if ($conn->query($query) === TRUE) {
        // Ambil ID yang baru saja dibuat
        $new_id = $conn->insert_id;
        
        echo json_encode([
            "status" => "success", 
            "message" => "Pendaftaran berhasil!",
            "user" => [
                "id" => $new_id,
                "name" => $nama,
                "kelas" => $kelas,
                "noAbsen" => $no_absen,
                "agama" => $agama,
                "username" => $username
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal mendaftar: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Semua data wajib diisi."]);
}

$conn->close();
?>