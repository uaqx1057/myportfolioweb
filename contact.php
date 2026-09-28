<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, bool $ok, string $error = ''): never {
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'error' => $error]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST'); respond(405, false, 'Method not allowed');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) respond(413, false, 'Message too large');
$testing = getenv('PORTFOLIO_TEST_MODE') === '1';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['https://www.codewithusman.com', 'https://codewithusman.com'];
if ($testing) $allowedOrigins[] = 'http://127.0.0.1:8770';
if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) respond(403, false, 'Origin not allowed');
foreach (['name', 'email', 'subject', 'message', '_gotcha', 'lang'] as $key) {
    if (isset($_POST[$key]) && !is_string($_POST[$key])) respond(422, false, 'Invalid input');
}
if (!empty($_POST['_gotcha'])) respond(200, true);
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');
if ($name === '' || $email === '' || $subject === '' || $message === ''
    || mb_strlen($name, 'UTF-8') > 100 || strlen($email) > 254
    || mb_strlen($subject, 'UTF-8') > 160 || mb_strlen($message, 'UTF-8') > 5000
    || preg_match('/[\r\n\x00]/', $name . $email . $subject)
    || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, false, 'Invalid input');

// The production configuration lives OUTSIDE public_html.
$configPath = getenv('CODEWITHUSMAN_MAIL_CONFIG') ?: dirname(__DIR__) . '/.config/codewithusman/mail.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config)) respond(503, false, 'Contact service unavailable');
$rateDirectory = $config['rate_directory'] ?? sys_get_temp_dir() . '/codewithusman-contact';
if (!is_dir($rateDirectory) && !@mkdir($rateDirectory, 0700, true) && !is_dir($rateDirectory)) respond(503, false, 'Contact service unavailable');
$salt = $config['rate_salt'] ?? '';
if (!$testing && strlen($salt) < 32) respond(503, false, 'Contact service unavailable');
// Atomic rate limit. Only hashed IPs and timestamps are stored, not messages.
$ipKey = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $salt ?: 'local-test-only');
$file = @fopen($rateDirectory . '/' . $ipKey . '.json', 'c+');
if (!$file || !flock($file, LOCK_EX)) respond(503, false, 'Contact service unavailable');
$now = time();
$attempts = json_decode(stream_get_contents($file) ?: '[]', true);
if (!is_array($attempts)) $attempts = [];
$attempts = array_values(array_filter($attempts, fn($t) => is_int($t) && $t > $now - 900));
if (count($attempts) >= 5) {
    flock($file, LOCK_UN); fclose($file); header('Retry-After: 900');
    respond(429, false, 'Please try again later');
}
$attempts[] = $now;
ftruncate($file, 0); rewind($file); fwrite($file, json_encode($attempts)); fflush($file);
flock($file, LOCK_UN); fclose($file);
if (random_int(1, 50) === 1) {
    foreach (glob($rateDirectory . '/*.json') ?: [] as $oldFile) {
        if (filemtime($oldFile) < $now - 86400) @unlink($oldFile);
    }
}
if ($testing) respond(200, true); // Only enabled by the isolated local test process.
if (empty($config['password']) || !is_file(__DIR__ . '/vendor/autoload.php')) {
    error_log('Portfolio contact: SMTP configuration or dependency missing');
    respond(503, false, 'Contact service unavailable');
}
require __DIR__ . '/vendor/autoload.php';
try {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['host'] ?? 'codewithusman.com';
    $mail->Port = (int) ($config['port'] ?? 465);
    $mail->SMTPAuth = true;
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    $mail->Username = $config['username'] ?? 'info@codewithusman.com';
    $mail->Password = $config['password'];
    $mail->Timeout = 15; $mail->CharSet = 'UTF-8';
    $mail->setFrom($mail->Username, 'Code With Usman');
    $mail->addAddress($config['recipient'] ?? 'usmanasif26261@gmail.com');
    $mail->addReplyTo($email, $name);
    $mail->Subject = '[Portfolio] ' . $subject;
    $mail->Body = "Name: {$name}\nEmail: {$email}\nSubject: {$subject}\n\n{$message}";
    $mail->send();
    // No automatic reply to arbitrary addresses: avoid an autoresponder spam relay.
    respond(200, true);
} catch (Throwable $error) {
    error_log('Portfolio contact: delivery failed (' . get_class($error) . ')');
    respond(502, false, 'Delivery failed; please use email or WhatsApp');
}
