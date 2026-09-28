<?php
// CLI-only TLS/authentication check. Does NOT send an email or display credentials.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$path = getenv('CODEWITHUSMAN_MAIL_CONFIG');
if (!$path || !is_file($path)) { fwrite(STDERR, "Private mail configuration is required.\n"); exit(1); }
$config = require $path;
require dirname(__DIR__) . '/vendor/autoload.php';
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
$mail->isSMTP(); $mail->Host = $config['host']; $mail->Port = $config['port'];
$mail->SMTPAuth = true; $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
$mail->Username = $config['username']; $mail->Password = $config['password']; $mail->Timeout = 20;
try {
    if (!$mail->smtpConnect()) throw new RuntimeException('Connection failed');
    $mail->smtpClose(); echo "SMTP TLS and authentication succeeded. No email sent.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "SMTP connection/authentication failed. Check host, TLS certificate, credentials and network access.\n"); exit(1);
}
