<?php
$conn = mysqli_connect("localhost", "root", "", "vulapp");
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
?>