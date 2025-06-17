<?php
session_start();
if (!isset($_SESSION['username'])) {
    die("Unauthorized access");
}
echo "Welcome, " . $_SESSION['username'];
?>


<title>Dashboard</title>
<link rel="stylesheet" href="css/style.css">
<body>
    <div class="container">
        <div class="header-container">
            <h1 class="header"> Welcome to the Dashboard </h1>
        </div>
        <div class = "content-container">
            <a href="upload.php" class="content">Upload File</a> |
            <a href="comments.php" class="content">Comment</a> |
            <a href="search.php" class="content">Search</a> |
            <a href="logout.php" class="content">Logout</a>
        </div>
    </div>
</body>