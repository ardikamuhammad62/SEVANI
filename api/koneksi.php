<?php
// koneksi.php
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$host = "localhost";
$user = "root"; // Sesuaikan dengan user database Anda
$pass = "";     // Sesuaikan dengan password database Anda
$db   = "sevani_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(["status" => "error", "message" => "Koneksi database gagal: " . $conn->connect_error], JSON_UNESCAPED_UNICODE));
}
$conn->set_charset("utf8mb4");