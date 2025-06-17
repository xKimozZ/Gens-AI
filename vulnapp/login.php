<?php
include 'db.php';
session_start();
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = $_POST['username'];
    $pass = $_POST['password'];
    $query = "SELECT * FROM users WHERE username='$user' AND password='$pass'";
    echo "DEBUG: " . $query . "<br>";
    $result = mysqli_query($conn, $query) or die(mysqli_error($conn));
    if (mysqli_num_rows($result)) {
        $_SESSION['username'] = $user;
        header("Location: dashboard.php");
    } else {
        echo "Invalid credentials";
    }
}
?>
<form method="POST">
  Username: <input type="text" name="username"><br>
  Password: <input type="password" name="password"><br>
  <input type="submit" value="Login">
</form>