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
$rateDirectory = $config['rate_directory'] ?? sys_get_temp_dir() . '/codewithusman-contact';
if (!is_dir($rateDirectory) && !@mkdir($rateDirectory, 0700, true) && !is_dir($rateDirectory)) respond(503, false, 'Contact service unavailable');
$now = time();

// Read-modify-write a small JSON state file under an exclusive lock.
function with_state(string $file, callable $change): mixed {
    $handle = @fopen($file, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) respond(503, false, 'Contact service unavailable');
    $state = json_decode(stream_get_contents($handle) ?: '[]', true);
    [$state, $result] = $change(is_array($state) ? $state : []);
    ftruncate($handle, 0); rewind($handle); fwrite($handle, json_encode($state)); fflush($handle);
    flock($handle, LOCK_UN); fclose($handle);
    return $result;
}
// Atomic sliding-window limit. Only hashed keys and timestamps are stored, never messages.
function limited(string $directory, string $key, array $windows, int $now): bool {
    return with_state("$directory/$key.json", function (array $attempts) use ($windows, $now) {
        $attempts = array_values(array_filter($attempts, fn($t) => is_int($t) && $t > $now - max(array_keys($windows))));
        foreach ($windows as $seconds => $max) {
            if (count(array_filter($attempts, fn($t) => $t > $now - $seconds)) >= $max) return [$attempts, true];
        }
        $attempts[] = $now;
        return [$attempts, false];
    });
}
function recent(string $directory, string $key, int $seconds, int $now): int {
    $attempts = json_decode((string) @file_get_contents("$directory/$key.json"), true);
    return is_array($attempts) ? count(array_filter($attempts, fn($t) => is_int($t) && $t > $now - $seconds)) : 0;
}
// Every SMTP message goes through here. Test mode records instead of sending.
function send_mail(array $config, bool $testing, string $directory, string $to, string $subject, string $body, string $replyEmail = '', string $replyName = ''): bool {
    if ($testing) {
        $entry = ['to' => $to, 'subject' => $subject, 'body' => $body];
        with_state("$directory/test-outbox.json", fn($box) => [array_merge($box, [$entry]), null]);
        return true;
    }
    if (empty($config['password']) || !is_file(__DIR__ . '/vendor/autoload.php')) {
        error_log('Portfolio contact: SMTP configuration or dependency missing');
        return false;
    }
    require_once __DIR__ . '/vendor/autoload.php';
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
        $mail->addAddress($to);
        if ($replyEmail !== '') $mail->addReplyTo($replyEmail, $replyName);
        $mail->Subject = $subject;
        $mail->Body = $body;
        $mail->send();
        return true;
    } catch (Throwable $error) {
        error_log('Portfolio contact: delivery failed (' . get_class($error) . ')');
        return false;
    }
}
$owner = $config['recipient'] ?? 'usmanasif26261@gmail.com';
// Count blocked attempts per day; alert the owner once per day when blocking starts.
function block(int $status, string $reason, string $public = ''): never {
    global $rateDirectory, $now, $config, $testing, $owner;
    $alert = with_state($rateDirectory . '/stats-' . date('Y-m-d', $now) . '.json', function (array $stats) use ($reason) {
        $stats['counts'][$reason] = ($stats['counts'][$reason] ?? 0) + 1;
        $total = array_sum($stats['counts']);
        $send = empty($stats['alerted']) && ($total >= 20 || str_starts_with($reason, 'rate_'));
        if ($send) $stats['alerted'] = true;
        return [$stats, $send ? $stats['counts'] : null];
    });
    if ($alert) {
        arsort($alert);
        $lines = implode("\n", array_map(fn($r, $n) => "  $r: $n", array_keys($alert), $alert));
        send_mail($config, $testing, $rateDirectory, $owner, '[Portfolio] Contact form is blocking suspicious traffic',
            "The contact form started blocking requests today (" . date('Y-m-d H:i T', $now) . ").\n\nBlocked so far, by reason:\n$lines\n\n"
            . "No action is needed: limits, the puzzle, Turnstile and email verification are working.\nThis alert is sent at most once per day.");
    }
    if ($status === 429) header('Retry-After: 900');
    respond($status, false, $public ?: $reason);
}
// Common throwaway-inbox providers used by spammers.
const DISPOSABLE_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la',
    '10minutemail.com', '10minutemail.net', 'temp-mail.org', 'tempmail.com', 'tempmail.net', 'tempmailo.com', 'temp-mail.io', 'tempr.email',
    'throwawaymail.com', 'yopmail.com', 'yopmail.net', 'getnada.com', 'nada.email', 'dispostable.com', 'trashmail.com', 'trashmail.de',
    'maildrop.cc', 'mailnesia.com', 'mintemail.com', 'mohmal.com', 'fakeinbox.com', 'fakemail.net', 'emailondeck.com', 'spamgourmet.com',
    'mailcatch.com', 'moakt.com', 'mytemp.email', 'tempinbox.com', 'burnermail.io', 'mailpoof.com', 'inboxkitten.com', 'discard.email',
    'spambox.us', 'mail.tm', 'email-fake.com', 'emailfake.com', 'luxusmail.org', 'cuvox.de', 'dayrep.com', 'einrot.com', 'fleckens.hu',
    'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us', 'armyspy.com', 'mailforspam.com', 'tmail.ws', 'tmpmail.org',
    'tmpmail.net', 'harakirimail.com', 'mail-temp.com', 'mailsac.com', 'spam4.me', '1secmail.com', '1secmail.net', 'dropmail.me'];

$powMax = (int) ($config['pow_max'] ?? 80000);
// GET ?token issues a short-lived signed token with a proof-of-work puzzle: the browser
// must find the number n (0..pow_max) where sha256(salt . n) equals the challenge.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['token'])) {
    $issued = (string) $now;
    $salt = bin2hex(random_bytes(12));
    $challenge = hash('sha256', $salt . random_int(0, $powMax));
    $signature = hash_hmac('sha256', "form|$issued|$salt|$challenge", $secret);
    respond(200, true, '', ['token' => "$issued.$salt.$challenge.$signature", 'max' => $powMax,
        'turnstile' => empty($config['turnstile_secret']) ? '' : ($config['turnstile_site_key'] ?? '')]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST'); respond(405, false, 'Method not allowed');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) respond(413, false, 'Message too large');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['https://www.codewithusman.com', 'https://codewithusman.com'];
if ($testing) $allowedOrigins[] = 'http://127.0.0.1:8770';
// Browsers always send Origin on a fetch POST; its absence means a script.
if (!in_array($origin, $allowedOrigins, true)) block(403, 'origin', 'Origin not allowed');
foreach (['name', 'email', 'subject', 'message', '_gotcha', 'lang', 'token', 'pow', 'otp', 'cf-turnstile-response'] as $key) {
    if (isset($_POST[$key]) && !is_string($_POST[$key])) block(422, 'invalid', 'Invalid input');
}
// Honeypot: pretend success so the bot does not adapt.
if (!empty($_POST['_gotcha'])) respond(200, true);

// Signed token: must be at least a few seconds old (humans type) and at most two hours.
[$issued, $salt, $challenge, $signature] = array_pad(explode('.', $_POST['token'] ?? '', 4), 4, '');
$age = $now - (int) $issued;
$minSeconds = (int) ($config['min_seconds'] ?? 3);
if (!ctype_digit($issued) || !hash_equals(hash_hmac('sha256', "form|$issued|$salt|$challenge", $secret), $signature)
    || $age > 7200) block(403, 'token_invalid');
if ($age < $minSeconds) block(403, 'too_fast');
$answer = $_POST['pow'] ?? '';
if (!ctype_digit($answer) || (int) $answer > $powMax || !hash_equals($challenge, hash('sha256', $salt . $answer))) block(403, 'pow_failed');

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$subject = trim($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');
if ($name === '' || $email === '' || $subject === '' || $message === ''
    || mb_strlen($name, 'UTF-8') > 100 || strlen($email) > 254
    || mb_strlen($subject, 'UTF-8') > 160 || mb_strlen($message, 'UTF-8') > 5000
    || preg_match('/[\r\n\x00]/', $name . $email . $subject)
    || !filter_var($email, FILTER_VALIDATE_EMAIL)) block(422, 'invalid', 'Invalid input');
// Link-stuffed messages are almost always spam.
if (preg_match_all('~https?://|www\.|\[url~i', $name . ' ' . $subject . ' ' . $message) > 2
    || preg_match('~https?://|www\.~i', $name)) block(422, 'links', 'Too many links');
// Disposable inboxes, and domains that cannot receive mail at all.
$domain = strtolower(substr(strrchr($email, '@'), 1));
$parts = explode('.', $domain);
$registrable = implode('.', array_slice($parts, -2));
if (in_array($domain, DISPOSABLE_DOMAINS, true) || in_array($registrable, DISPOSABLE_DOMAINS, true)) block(422, 'email_domain');
if (($config['dns_check'] ?? true) && !checkdnsrr($domain, 'MX') && !checkdnsrr($domain, 'A')) block(422, 'email_domain');

// Cloudflare Turnstile CAPTCHA, enabled when a secret is configured.
if (!empty($config['turnstile_secret'])) {
    $captcha = $_POST['cf-turnstile-response'] ?? '';
    $context = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 8, 'ignore_errors' => true,
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query(['secret' => $config['turnstile_secret'], 'response' => $captcha, 'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''])]]);
    $verdict = $captcha === '' ? null : json_decode((string) @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context), true);
    if (empty($verdict['success'])) block(403, 'captcha', 'Verification failed');
}

// Each solved puzzle is accepted once (stops replaying one solution many times).
$replayed = with_state("$rateDirectory/used-puzzles.json", function (array $seen) use ($salt, $now) {
    $seen = array_filter($seen, fn($t) => is_int($t) && $t > $now - 7200);
    if (isset($seen[$salt])) return [$seen, true];
    $seen[$salt] = $now;
    return [$seen, false];
});
if ($replayed) block(403, 'token_invalid');
$ipKey = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $secret);
if (limited($rateDirectory, $ipKey, [900 => 5, 86400 => 10], $now)) block(429, 'rate_ip', 'Please try again later');

// Under unusual load, ask for a 6-digit code emailed to the sender before accepting.
// The code email has fixed text only, and code sending is capped, so it cannot relay spam.
$emailKey = hash_hmac('sha256', strtolower($email), $secret);
$code = $_POST['otp'] ?? '';
$verified = false;
if ($code !== '') {
    $verified = with_state("$rateDirectory/otp-codes.json", function (array $codes) use ($emailKey, $code, $secret, $now) {
        $codes = array_filter($codes, fn($c) => is_array($c) && ($c['exp'] ?? 0) > $now);
        $entry = $codes[$emailKey] ?? null;
        if (!$entry || $entry['tries'] >= 5) return [$codes, false];
        if (hash_equals($entry['hash'], hash_hmac('sha256', $code, $secret))) { unset($codes[$emailKey]); return [$codes, true]; }
        $codes[$emailKey]['tries']++;
        return [$codes, false];
    });
    if (!$verified) block(403, 'otp_invalid');
}
$attack = recent($rateDirectory, 'global', 3600, $now) >= (int) ($config['challenge_threshold'] ?? 10);
if ($attack && !$verified) {
    if (limited($rateDirectory, 'otp-global', [86400 => 30], $now) || limited($rateDirectory, 'otp-' . $emailKey, [900 => 1, 86400 => 3], $now)
        || limited($rateDirectory, 'otp-ip-' . $ipKey, [3600 => 3], $now)) block(429, 'rate_otp', 'Please try again later');
    $newCode = (string) random_int(100000, 999999);
    with_state("$rateDirectory/otp-codes.json", function (array $codes) use ($emailKey, $newCode, $secret, $now) {
        $codes = array_filter($codes, fn($c) => is_array($c) && ($c['exp'] ?? 0) > $now);
        $codes[$emailKey] = ['hash' => hash_hmac('sha256', $newCode, $secret), 'exp' => $now + 900, 'tries' => 0];
        return [$codes, null];
    });
    $arabic = ($_POST['lang'] ?? '') === 'ar';
    $sent = send_mail($config, $testing, $rateDirectory, $email,
        $arabic ? 'رمز التحقق من Code With Usman' : 'Your Code With Usman verification code',
        $arabic ? "رمز التحقق الخاص بك هو: $newCode\n\nأدخله في نموذج التواصل لإرسال رسالتك. ينتهي خلال 15 دقيقة.\nإذا لم تطلب هذا الرمز، تجاهل هذه الرسالة."
                : "Your verification code is: $newCode\n\nEnter it in the contact form to send your message. It expires in 15 minutes.\nIf you did not request this code, you can ignore this email.");
    if (!$sent) respond(502, false, 'Delivery failed; please use email or WhatsApp');
    respond(200, false, 'verify_email', $testing ? ['test_code' => $newCode] : []);
}

// Site-wide cap so a distributed flood cannot send thousands of messages.
if (limited($rateDirectory, 'global', $config['global_limits'] ?? [3600 => 20, 86400 => 60], $now)) {
    error_log('Portfolio contact: site-wide limit reached');
    block(429, 'rate_global', 'Please try again later');
}
if (random_int(1, 50) === 1) {
    foreach (glob($rateDirectory . '/*.json') ?: [] as $oldFile) {
        if (!in_array(basename($oldFile), ['global.json', 'used-puzzles.json', 'otp-codes.json', 'otp-global.json'], true) && filemtime($oldFile) < $now - 172800) @unlink($oldFile);
    }
}
// Only ever sent to the site owner; never to the address typed into the form.
$delivered = send_mail($config, $testing, $rateDirectory, $owner, '[Portfolio] ' . $subject,
    "Name: {$name}\nEmail: {$email}\nSubject: {$subject}\nIP hash: " . substr($ipKey, 0, 12) . ($verified ? "\nEmail verified: yes" : '') . "\n\n{$message}",
    $email, $name);
$delivered ? respond(200, true) : respond(502, false, 'Delivery failed; please use email or WhatsApp');
