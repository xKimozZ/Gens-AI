<?php
include 'db.php';
if (isset($_GET['query'])) {
    $q = $_GET['query'];
    $sql = "SELECT * FROM users WHERE username LIKE '%$q%'";
    $res = mysqli_query($conn, $sql);
    while ($row = mysqli_fetch_assoc($res)) {
        echo $row['username'] . "<br>";
    }
}
?>
<form method="GET">
  Search: <input type="text" name="query">
  <input type="submit" value="Search">
</form>