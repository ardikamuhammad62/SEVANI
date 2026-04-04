<?php
// api/save_habit.php
header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

function isGuruByUserId($conn, $user_id) {
    $res = $conn->query("SELECT kelas FROM users WHERE id = '$user_id' LIMIT 1");
    if (!$res || $res->num_rows === 0) return false;
    $row = $res->fetch_assoc();
    return strtolower((string)$row['kelas']) === 'guru';
}

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->tanggal) && isset($data->habit_data)) {
    $user_id = $conn->real_escape_string($data->user_id);

    if (isGuruByUserId($conn, $user_id)) {
        echo json_encode(["status" => "error", "message" => "Akun guru hanya bisa melihat jurnal murid."]);
        $conn->close();
        exit();
    }

    $tanggal = $conn->real_escape_string($data->tanggal);
    $habit_data = $conn->real_escape_string(json_encode($data->habit_data));

    // INSERT jika belum ada, UPDATE jika user_id & tanggal sudah ada (berkat UNIQUE KEY)
    $query = "INSERT INTO daily_habits (user_id, tanggal, habit_data) 
              VALUES ('$user_id', '$tanggal', '$habit_data') 
              ON DUPLICATE KEY UPDATE habit_data = '$habit_data'";

    if ($conn->query($query) === TRUE) {
        echo json_encode(["status" => "success", "message" => "Kebiasaan disimpan"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
}
$conn->close();
?>