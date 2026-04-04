<?php
// api/get_teacher_journals.php
header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

$user_id = isset($_GET['user_id']) ? $conn->real_escape_string($_GET['user_id']) : '';

if ($user_id === '') {
    echo json_encode(["status" => "error", "message" => "User ID diperlukan."]);
    exit();
}

$role_check = $conn->query("SELECT kelas FROM users WHERE id = '$user_id' LIMIT 1");
if (!$role_check || $role_check->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Pengguna tidak ditemukan."]);
    exit();
}

$role_row = $role_check->fetch_assoc();
if (strtolower((string)$role_row['kelas']) !== 'guru') {
    echo json_encode(["status" => "error", "message" => "Hanya akun guru yang dapat melihat data ini."]);
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
    echo json_encode(["status" => "error", "message" => "Gagal mengambil jurnal murid."]);
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
]);

$conn->close();
?>
