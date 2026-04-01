<?php
// api/save_journal.php
header("Content-Type: application/json; charset=UTF-8");
require 'koneksi.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->id)) {
    $id = $conn->real_escape_string($data->id);
    $user_id = $conn->real_escape_string($data->user_id);
    $title = $conn->real_escape_string($data->title);
    $tanggal = $conn->real_escape_string($data->date); // dari JS namanya 'date'
    $subject = $conn->real_escape_string($data->subject);
    $category = $conn->real_escape_string($data->category);
    $mood = $conn->real_escape_string($data->mood);
    $rating = (int)$data->rating;
    $content = $conn->real_escape_string($data->content);
    $keypoints = $conn->real_escape_string($data->keypoints ?? '');
    $questions = $conn->real_escape_string($data->questions ?? '');

    $query = "INSERT INTO journals (id, user_id, title, tanggal, subject, category, mood, rating, content, keypoints, questions) 
              VALUES ('$id', '$user_id', '$title', '$tanggal', '$subject', '$category', '$mood', $rating, '$content', '$keypoints', '$questions')";

    if ($conn->query($query) === TRUE) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
}
$conn->close();
?>