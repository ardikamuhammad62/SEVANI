<?php
// api/delete_all_data.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

function isGuruByUserId($conn, $user_id) {
    $res = $conn->query("SELECT kelas FROM users WHERE id = '$user_id' LIMIT 1");
    if (!$res || $res->num_rows === 0) return false;
    $row = $res->fetch_assoc();
    return strtolower((string)$row['kelas']) === 'guru';
}

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $user_id = $conn->real_escape_string($data->user_id);

    if (isGuruByUserId($conn, $user_id)) {
        echo json_encode(["status" => "error", "message" => "Akun guru hanya bisa melihat jurnal murid."]);
        $conn->close();
        exit();
    }
    
    // Hapus semua jurnal milik user
    $hapus_journals = $conn->query("DELETE FROM journals WHERE user_id='$user_id'");
    
    // Hapus juga riwayat centang kebiasaannya (opsional, tapi disarankan agar reset total)
    $hapus_habits = $conn->query("DELETE FROM daily_habits WHERE user_id='$user_id'");

    if ($hapus_journals && $hapus_habits) {
        echo json_encode(["status" => "success", "message" => "Semua data berhasil dihapus"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menghapus data: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "User ID tidak valid"]);
}

$conn->close();
?>