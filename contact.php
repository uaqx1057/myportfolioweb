<?php
header('Content-Type: application/json');

$ownerEmail = 'usmanasif26261@gmail.com';
$fromEmail = 'info@codewithusman.com';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Honeypot field - real visitors never fill this in, bots usually do.
if (!empty($_POST['_gotcha'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function clean_header_value($value) {
    return trim(str_replace(["\r", "\n"], '', $value));
}

function encode_subject($subject) {
    return mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
}

function message_id($domain) {
    return '<' . bin2hex(random_bytes(16)) . '@' . $domain . '>';
}

$name = clean_header_value($_POST['name'] ?? '');
$email = clean_header_value($_POST['email'] ?? '');
$subject = clean_header_value($_POST['subject'] ?? '');
$message = trim($_POST['message'] ?? '');
$lang = ($_POST['lang'] ?? '') === 'ar' ? 'ar' : 'en';

if ($name === '' || $email === '' || $subject === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Invalid input']);
    exit;
}

// Notify the site owner with the visitor's message.
$ownerBody = "New message from the portfolio contact form.\n\n"
    . "Name: {$name}\n"
    . "Email: {$email}\n"
    . "Subject: {$subject}\n\n"
    . "Message:\n{$message}\n";

$ownerHeaders = [
    'From: ' . $fromEmail,
    'Reply-To: ' . $name . ' <' . $email . '>',
    'Date: ' . date('r'),
    'Message-ID: ' . message_id('codewithusman.com'),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8'
];

$sent = @mail($ownerEmail, encode_subject('[Portfolio Contact] ' . $subject), $ownerBody, implode("\r\n", $ownerHeaders));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to send']);
    exit;
}

// Best-effort confirmation reply to the visitor - doesn't affect the success response above.
$replySubject = $lang === 'ar' ? 'شكراً لتواصلك - عثمان آصف قريشي' : 'Thanks for reaching out - Usman Asif Qureshi';

if ($lang === 'ar') {
    $replyBody = "مرحباً {$name}،\n\n"
        . "شكراً لتواصلك! لقد استلمت رسالتك وسأتواصل معك قريباً.\n\n"
        . "نسخة مما أرسلته:\n"
        . "الموضوع: {$subject}\n"
        . "الرسالة:\n{$message}\n\n"
        . "مع أطيب التحيات،\n"
        . "عثمان آصف قريشي";
} else {
    $replyBody = "Hi {$name},\n\n"
        . "Thanks for reaching out! I've received your message and will contact you soon.\n\n"
        . "Here's a copy of what you sent:\n"
        . "Subject: {$subject}\n"
        . "Message:\n{$message}\n\n"
        . "Best regards,\n"
        . "Usman Asif Qureshi";
}

$replyHeaders = [
    'From: Usman Asif Qureshi <' . $fromEmail . '>',
    'Date: ' . date('r'),
    'Message-ID: ' . message_id('codewithusman.com'),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8'
];

@mail($email, encode_subject($replySubject), $replyBody, implode("\r\n", $replyHeaders));

echo json_encode(['ok' => true]);
