<?php
// api/delete_journal.php
header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->user_id)) {
    $id = $conn->real_escape_string($data->id);
    $user_id = $conn->real_escape_string($data->user_id);
    
    // Hapus jurnal milik user tersebut
    if ($conn->query("DELETE FROM journals WHERE id='$id' AND user_id='$user_id'") === TRUE) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
}
$conn->close();
?>