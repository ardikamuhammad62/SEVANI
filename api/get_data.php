<?php
// api/get_data.php
error_reporting(0);
header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

$user_id = isset($_GET['user_id']) ? $conn->real_escape_string($_GET['user_id']) : '';

if (empty($user_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "User ID diperlukan"], JSON_UNESCAPED_UNICODE);
    exit();
}

// 1. Ambil data habits
$habits = [];
$res_habits = $conn->query("SELECT tanggal, habit_data FROM daily_habits WHERE user_id = '$user_id'");
if ($res_habits) {
    while ($row = $res_habits->fetch_assoc()) {
        $habits[$row['tanggal']] = json_decode($row['habit_data']);
    }
}

// 2. Ambil data journals
$journals = [];
$res_journals = $conn->query("SELECT * FROM journals WHERE user_id = '$user_id' ORDER BY tanggal DESC, created_at DESC");
if ($res_journals) {
    while ($row = $res_journals->fetch_assoc()) {
        // Sesuaikan nama field 'tanggal' dari DB ke 'date' untuk JS
        $row['date'] = $row['tanggal']; 
        unset($row['tanggal']);
        $journals[] = $row;
    }
}

echo json_encode([
    "status" => "success",
    "habits" => $habits,
    "journals" => $journals
], JSON_UNESCAPED_UNICODE);
$conn->close();
?>