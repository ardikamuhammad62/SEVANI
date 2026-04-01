<?php
// koneksi.php
$host = "localhost";
$user = "root"; // Sesuaikan dengan user database Anda
$pass = "";     // Sesuaikan dengan password database Anda
$db   = "sevani_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["status" => "error", "message" => "Koneksi database gagal: " . $conn->connect_error]));
}
?>