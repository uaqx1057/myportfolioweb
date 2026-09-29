<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(int $status, bool $ok, string $error = '', array $extra = []): never {
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'error' => $error] + $extra);
    exit;
}
$testing = getenv('PORTFOLIO_TEST_MODE') === '1';
// The production configuration lives OUTSIDE public_html.
$configPath = getenv('CODEWITHUSMAN_MAIL_CONFIG') ?: dirname(__DIR__) . '/.config/codewithusman/mail.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config)) respond(503, false, 'Contact service unavailable');
$salt = $config['rate_salt'] ?? '';
if (!$testing && strlen($salt) < 32) respond(503, false, 'Contact service unavailable');
$secret = $salt ?: 'local-test-only';

// GET ?token issues a short-lived signed form token. Bots that post directly skip it.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['token'])) {
    $issued = (string) time();
    respond(200, true, '', ['token' => $issued . '.' . hash_hmac('sha256', 'form|' . $issued, $secret),
        'turnstile' => $config['turnstile_site_key'] ?? '']);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST'); respond(405, false, 'Method not allowed');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) respond(413, false, 'Message too large');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['https://www.codewithusman.com', 'https://codewithusman.com'];
if ($testing) $allowedOrigins[] = 'http://127.0.0.1:8770';
// Browsers always send Origin on a cross-site or fetch POST; its absence means a script.
if (!in_array($origin, $allowedOrigins, true)) respond(403, false, 'Origin not allowed');
foreach (['name', 'email', 'subject', 'message', '_gotcha', 'lang', 'token', 'cf-turnstile-response'] as $key) {
    if (isset($_POST[$key]) && !is_string($_POST[$key])) respond(422, false, 'Invalid input');
}
if (!empty($_POST['_gotcha'])) respond(200, true);

// Signed token: must be at least a few seconds old (humans type) and at most two hours.
[$issued, $signature] = array_pad(explode('.', $_POST['token'] ?? '', 2), 2, '');
$age = time() - (int) $issued;
$minSeconds = (int) ($config['min_seconds'] ?? 3);
if (!ctype_digit($issued) || !hash_equals(hash_hmac('sha256', 'form|' . $issued, $secret), $signature)
    || $age > 7200) respond(403, false, 'token_invalid');
if ($age < $minSeconds) respond(403, false, 'too_fast');

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');
if ($name === '' || $email === '' || $subject === '' || $message === ''
    || mb_strlen($name, 'UTF-8') > 100 || strlen($email) > 254
    || mb_strlen($subject, 'UTF-8') > 160 || mb_strlen($message, 'UTF-8') > 5000
    || preg_match('/[\r\n\x00]/', $name . $email . $subject)
    || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, false, 'Invalid input');
// Link-stuffed messages are almost always spam.
if (preg_match_all('~https?://|www\.|\[url~i', $name . ' ' . $subject . ' ' . $message) > 2
    || preg_match('~https?://|www\.~i', $name)) respond(422, false, 'Too many links');

// Optional Cloudflare Turnstile CAPTCHA, enabled when a secret is configured.
if (!empty($config['turnstile_secret'])) {
    $answer = $_POST['cf-turnstile-response'] ?? '';
    $context = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 8,
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query(['secret' => $config['turnstile_secret'], 'response' => $answer, 'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''])]]);
    $verdict = $answer === '' ? null : json_decode((string) @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context), true);
    if (empty($verdict['success'])) respond(403, false, 'Verification failed');
}

$rateDirectory = $config['rate_directory'] ?? sys_get_temp_dir() . '/codewithusman-contact';
if (!is_dir($rateDirectory) && !@mkdir($rateDirectory, 0700, true) && !is_dir($rateDirectory)) respond(503, false, 'Contact service unavailable');
$now = time();
// Atomic sliding-window limit. Only hashed keys and timestamps are stored, never messages.
function limited(string $directory, string $key, array $windows, int $now): bool {
    $file = @fopen($directory . '/' . $key . '.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) respond(503, false, 'Contact service unavailable');
    $attempts = json_decode(stream_get_contents($file) ?: '[]', true);
    $longest = max(array_keys($windows));
    $attempts = array_values(array_filter(is_array($attempts) ? $attempts : [], fn($t) => is_int($t) && $t > $now - $longest));
    foreach ($windows as $seconds => $max) {
        if (count(array_filter($attempts, fn($t) => $t > $now - $seconds)) >= $max) { flock($file, LOCK_UN); fclose($file); return true; }
    }
    $attempts[] = $now;
    ftruncate($file, 0); rewind($file); fwrite($file, json_encode($attempts)); fflush($file);
    flock($file, LOCK_UN); fclose($file);
    return false;
}
$ipKey = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $secret);
if (limited($rateDirectory, $ipKey, [900 => 5, 86400 => 10], $now)) { header('Retry-After: 900'); respond(429, false, 'Please try again later'); }
// Site-wide cap so a distributed flood cannot send thousands of messages.
$global = $config['global_limits'] ?? [3600 => 20, 86400 => 60];
if (limited($rateDirectory, 'global', $global, $now)) {
    error_log('Portfolio contact: site-wide limit reached');
    header('Retry-After: 3600'); respond(429, false, 'Please try again later');
}
if (random_int(1, 50) === 1) {
    foreach (glob($rateDirectory . '/*.json') ?: [] as $oldFile) {
        if (basename($oldFile) !== 'global.json' && filemtime($oldFile) < $now - 172800) @unlink($oldFile);
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
    // Only ever sent to the site owner; never to the address typed into the form.
    $mail->addAddress($config['recipient'] ?? 'usmanasif26261@gmail.com');
    $mail->addReplyTo($email, $name);
    $mail->Subject = '[Portfolio] ' . $subject;
    $mail->Body = "Name: {$name}\nEmail: {$email}\nSubject: {$subject}\nIP hash: " . substr($ipKey, 0, 12) . "\n\n{$message}";
    $mail->send();
    respond(200, true);
} catch (Throwable $error) {
    error_log('Portfolio contact: delivery failed (' . get_class($error) . ')');
    respond(502, false, 'Delivery failed; please use email or WhatsApp');
}
