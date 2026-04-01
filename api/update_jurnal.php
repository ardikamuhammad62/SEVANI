<?php
// api/update_journal.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->user_id)) {
    $id = $conn->real_escape_string($data->id);
    $user_id = $conn->real_escape_string($data->user_id);
    
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