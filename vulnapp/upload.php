<?php
session_start();
include 'db.php';
if ($_FILES['file']) {
    $filename = $_FILES['file']['name'];
    $tmp = $_FILES['file']['tmp_name']; 
    $user = $_SESSION['username'];
    $user_id = mysqli_fetch_assoc(mysqli_query($conn, "SELECT id FROM users WHERE username='$user'"))['id'];
    mysqli_query($conn, "INSERT INTO uploads (user_id, filename, filepath) VALUES ($user_id, '$filename', 'uploads/$filename')");
    echo "File uploaded.";
}
?>
<form method="POST" enctype="multipart/form-data">
  Upload: <input type="file" name="file">
  <input type="submit" value="Upload">
</form>