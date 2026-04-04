<?php
// api/save_journal.php
error_reporting(0);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');

header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

// Debug logging
$raw_input = file_get_contents("php://input");
error_log('save_journal.php - Raw input: ' . $raw_input);

$data = json_decode($raw_input);
error_log('save_journal.php - Decoded data: ' . json_encode($data));

function isGuruByUserId($conn, $user_id) {
    $res = $conn->query("SELECT kelas FROM users WHERE id = '$user_id' LIMIT 1");
    if (!$res || $res->num_rows === 0) return false;
    $row = $res->fetch_assoc();
    return strtolower((string)$row['kelas']) === 'guru';
}

if (!empty($data->user_id) && !empty($data->id)) {
    error_log('save_journal.php - Valid data received: user_id=' . $data->user_id . ', id=' . $data->id);
    $id = $conn->real_escape_string($data->id);
    $user_id = $conn->real_escape_string($data->user_id);

    if (isGuruByUserId($conn, $user_id)) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Akun guru hanya bisa melihat jurnal murid."], JSON_UNESCAPED_UNICODE);
        $conn->close();
        exit();
    }

    $title = $conn->real_escape_string($data->title ?? '');
    $tanggal = $conn->real_escape_string($data->date ?? ''); // dari JS namanya 'date'
    $subject = $conn->real_escape_string($data->subject ?? '');
    $category = $conn->real_escape_string($data->category ?? '');
    $mood = $conn->real_escape_string($data->mood ?? '');
    $rating = (int)($data->rating ?? 0);
    $content = $conn->real_escape_string($data->content ?? '');
    $keypoints = $conn->real_escape_string($data->keypoints ?? '');
    $questions = $conn->real_escape_string($data->questions ?? '');

    error_log('save_journal.php - Fields: id=' . $id . ', user_id=' . $user_id . ', tanggal=' . $tanggal . ', title=' . $title);

    $query = "INSERT INTO journals (id, user_id, title, tanggal, subject, category, mood, rating, content, keypoints, questions) 
              VALUES ('$id', '$user_id', '$title', '$tanggal', '$subject', '$category', '$mood', $rating, '$content', '$keypoints', '$questions')";

    error_log('save_journal.php - Query: ' . $query);

    if ($conn->query($query) === TRUE) {
        error_log('save_journal.php - SUCCESS: Journal saved with id=' . $id);
        echo json_encode(["status" => "success"], JSON_UNESCAPED_UNICODE);
    } else {
        error_log('save_journal.php - ERROR: ' . $conn->error);
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $conn->error], JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "user_id dan id diperlukan"], JSON_UNESCAPED_UNICODE);
}
$conn->close();
?>