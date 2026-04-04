<?php
// api/update_journal.php
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

if (!empty($data->id) && !empty($data->user_id)) {
    $id = $conn->real_escape_string($data->id);
    $user_id = $conn->real_escape_string($data->user_id);

    if (isGuruByUserId($conn, $user_id)) {
        echo json_encode(["status" => "error", "message" => "Akun guru hanya bisa melihat jurnal murid."]);
        $conn->close();
        exit();
    }
    
    // Field yang biasanya di-edit
    $content = $conn->real_escape_string($data->content);
    $keypoints = $conn->real_escape_string($data->keypoints ?? '');
    $questions = $conn->real_escape_string($data->questions ?? '');

    $query = "UPDATE journals SET content='$content', keypoints='$keypoints', questions='$questions' 
              WHERE id='$id' AND user_id='$user_id'";

    if ($conn->query($query) === TRUE) {
        echo json_encode(["status" => "success", "message" => "Jurnal berhasil diperbarui"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal update jurnal: " . $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap"]);
}

$conn->close();
?>