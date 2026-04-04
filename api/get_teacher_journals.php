<?php
// api/get_teacher_journals.php
error_reporting(0);
header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

$user_id = isset($_GET['user_id']) ? $conn->real_escape_string($_GET['user_id']) : '';

if ($user_id === '') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "User ID diperlukan."], JSON_UNESCAPED_UNICODE);
    exit();
}

$role_check = $conn->query("SELECT kelas FROM users WHERE id = '$user_id' LIMIT 1");
if (!$role_check || $role_check->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Pengguna tidak ditemukan."], JSON_UNESCAPED_UNICODE);
    exit();
}

$role_row = $role_check->fetch_assoc();
if (strtolower((string)$role_row['kelas']) !== 'guru') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Hanya akun guru yang dapat melihat data ini."], JSON_UNESCAPED_UNICODE);
    exit();
}

$journals = [];
$query = "
    SELECT
        j.id,
        j.user_id,
        j.title,
        j.tanggal,
        j.subject,
        j.category,
        j.mood,
        j.rating,
        j.content,
        j.keypoints,
        j.questions,
        u.id AS student_id,
        u.nama AS student_name,
        u.kelas AS student_class,
        u.no_absen AS student_no_absen
    FROM journals j
    INNER JOIN users u ON u.id = j.user_id
    WHERE LOWER(u.kelas) <> 'guru'
    ORDER BY u.kelas ASC, j.tanggal DESC, j.id DESC
";

$result = $conn->query($query);
if (!$result) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal mengambil jurnal murid."], JSON_UNESCAPED_UNICODE);
    exit();
}

while ($row = $result->fetch_assoc()) {
    $row['date'] = $row['tanggal'];
    unset($row['tanggal']);
    $journals[] = $row;
}

echo json_encode([
    "status" => "success",
    "journals" => $journals
], JSON_UNESCAPED_UNICODE);

$conn->close();
?>
