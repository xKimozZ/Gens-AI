<?php
include 'db.php';
if ($_POST) {
    $user = $_POST['username'];
    $email = $_POST['email'];
    $pass = $_POST['password'];
    $query = "INSERT INTO users (username, email, password) VALUES ('$user', '$email', '$pass')";
    mysqli_query($conn, $query);
    echo "Registered!";
}
?>
<form method="POST">
  Username: <input type="text" name="username"><br>
  Email: <input type="email" name="email"><br>
  Password: <input type="password" name="password"><br>
  <input type="submit" value="Register">
</form>