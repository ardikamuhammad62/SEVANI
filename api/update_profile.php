<?php
// api/update_profile.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->nama) && !empty($data->kelas) && !empty($data->username)) {
    
    $id = $conn->real_escape_string($data->id);
    $nama = $conn->real_escape_string($data->nama);
    $kelas = $conn->real_escape_string($data->kelas);
    $username = $conn->real_escape_string($data->username);

    $cek_username = $conn->query("SELECT id FROM users WHERE username = '$username' AND id != '$id'");
    if ($cek_username->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "Username sudah digunakan oleh orang lain!"]);
        exit();
    }

    if (!empty($data->password)) {
        $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
        $query = "UPDATE users SET nama='$nama', kelas='$kelas', username='$username', password='$hashed_password' WHERE id='$id'";
    } else {
        $query = "UPDATE users SET nama='$nama', kelas='$kelas', username='$username' WHERE id='$id'";
    }

    if ($conn->query($query) === TRUE) {
        // PERBAIKAN: Ambil data user LENGKAP setelah di-update agar sesi di JS tidak hilang
        $result = $conn->query("SELECT id, nama, kelas, no_absen, agama, username FROM users WHERE id='$id'");
        $user_data = $result->fetch_assoc();

        echo json_encode([
            "status" => "success",
            "message" => "Profil berhasil diperbarui!",
            "user" => [
                "id" => $user_data['id'],
                "nama" => $user_data['nama'],
                "kelas" => $user_data['kelas'],
                "noAbsen" => $user_data['no_absen'],
                "agama" => $user_data['agama'],
                "username" => $user_data['username']
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal memperbarui profil: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
}

$conn->close();
?>