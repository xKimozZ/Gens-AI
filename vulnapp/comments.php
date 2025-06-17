<?php
include 'db.php';
if ($_POST) {
    $user = $_POST['user_id'];
    $comment = $_POST['comment'];
    echo "DEBUG: User ID: $user, Comment: $comment<br>";
    mysqli_query($conn, "INSERT INTO comments (user_id, comment) VALUES ($user, '$comment')");
}
$results = mysqli_query($conn, "SELECT * FROM comments");
while ($row = mysqli_fetch_assoc($results)) {
    echo "<b>User {$row['user_id']}</b>: {$row['comment']}<br>";
}
?>
<form method="POST">
  User ID: <input type="text" name="user_id"><br>
  Comment: <textarea name="comment"></textarea><br>
  <input type="submit" value="Submit">
</form>